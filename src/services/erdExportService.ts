// ERD Export Service for QueryFlow
// Exports ERD diagrams to various formats (PNG, SVG, PDF)

import { Node, Edge } from '@xyflow/react';
import { DatabaseSchema } from '@/types/database';

export interface ERDExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'jpg';
  quality?: number; // 0.1 to 1.0 for image formats
  scale?: number; // Scale factor for export
  backgroundColor?: string;
  theme?: 'default' | 'modern' | 'minimal' | 'colorful' | 'dark' | 'light';
  includeMetadata?: boolean;
  paperSize?: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Custom';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  watermark?: {
    text: string;
    opacity: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
}

export interface ERDExportResult {
  success: boolean;
  data?: Blob | string;
  filename: string;
  format: string;
  size: number;
  dimensions: {
    width: number;
    height: number;
  };
  errors?: string[];
  warnings?: string[];
}

export class ERDExportService {
  private static readonly PAPER_SIZES = {
    A4: { width: 595, height: 842 },
    A3: { width: 842, height: 1191 },
    Letter: { width: 612, height: 792 },
    Legal: { width: 612, height: 1008 }
  };

  /**
   * Export ERD diagram to specified format
   */
  static async exportDiagram(
    container: HTMLElement,
    nodes: Node[],
    edges: Edge[],
    schema: DatabaseSchema,
    options: ERDExportOptions
  ): Promise<ERDExportResult> {
    try {
      const bounds = this.calculateBounds(nodes);
      const dimensions = this.calculateExportDimensions(bounds, options);
      
      switch (options.format) {
        case 'svg':
          return await this.exportSVG(container, nodes, edges, schema, options, dimensions);
        case 'png':
        case 'jpg':
          return await this.exportImage(container, nodes, edges, schema, options, dimensions);
        case 'pdf':
          return await this.exportPDF(container, nodes, edges, schema, options, dimensions);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      return {
        success: false,
        filename: '',
        format: options.format,
        size: 0,
        dimensions: { width: 0, height: 0 },
        errors: [error instanceof Error ? error.message : 'Export failed']
      };
    }
  }

  /**
   * Export as SVG format
   */
  private static async exportSVG(
    container: HTMLElement,
    nodes: Node[],
    edges: Edge[],
    schema: DatabaseSchema,
    options: ERDExportOptions,
    dimensions: { width: number; height: number }
  ): Promise<ERDExportResult> {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', dimensions.width.toString());
    svg.setAttribute('height', dimensions.height.toString());
    svg.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Add styles
    const styles = this.generateSVGStyles(options.theme || 'default');
    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleElement.textContent = styles;
    svg.appendChild(styleElement);

    // Add background
    if (options.backgroundColor) {
      const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      background.setAttribute('width', '100%');
      background.setAttribute('height', '100%');
      background.setAttribute('fill', options.backgroundColor);
      svg.appendChild(background);
    }

    // Create diagram group
    const diagramGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    diagramGroup.setAttribute('class', 'erd-diagram');
    
    // Add edges first (so they appear behind nodes)
    edges.forEach(edge => {
      const edgeElement = this.createSVGEdge(edge, nodes, options);
      diagramGroup.appendChild(edgeElement);
    });

    // Add nodes
    nodes.forEach(node => {
      const nodeElement = this.createSVGNode(node, options);
      diagramGroup.appendChild(nodeElement);
    });

    svg.appendChild(diagramGroup);

    // Add metadata if requested
    if (options.includeMetadata) {
      const metadata = this.createSVGMetadata(schema, options);
      svg.appendChild(metadata);
    }

    // Add watermark if specified
    if (options.watermark) {
      const watermark = this.createSVGWatermark(options.watermark, dimensions);
      svg.appendChild(watermark);
    }

    const svgString = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    
    return {
      success: true,
      data: blob,
      filename: `${schema.name}_erd.svg`,
      format: 'svg',
      size: blob.size,
      dimensions
    };
  }

  /**
   * Export as PNG/JPG image
   */
  private static async exportImage(
    container: HTMLElement,
    nodes: Node[],
    edges: Edge[],
    schema: DatabaseSchema,
    options: ERDExportOptions,
    dimensions: { width: number; height: number }
  ): Promise<ERDExportResult> {
    // First create SVG
    const svgResult = await this.exportSVG(container, nodes, edges, schema, {
      ...options,
      format: 'svg'
    }, dimensions);

    if (!svgResult.success || !svgResult.data) {
      throw new Error('Failed to generate SVG for image export');
    }

    // Convert SVG to image using canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const scale = options.scale || 1;

    canvas.width = dimensions.width * scale;
    canvas.height = dimensions.height * scale;

    // Set background color
    if (options.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                success: true,
                data: blob,
                filename: `${schema.name}_erd.${options.format}`,
                format: options.format,
                size: blob.size,
                dimensions: { width: canvas.width, height: canvas.height }
              });
            } else {
              resolve({
                success: false,
                filename: '',
                format: options.format,
                size: 0,
                dimensions: { width: 0, height: 0 },
                errors: ['Failed to create image blob']
              });
            }
          },
          `image/${options.format}`,
          options.quality || 0.9
        );
      };

      img.onerror = () => {
        resolve({
          success: false,
          filename: '',
          format: options.format,
          size: 0,
          dimensions: { width: 0, height: 0 },
          errors: ['Failed to load SVG for image conversion']
        });
      };

      const svgBlob = svgResult.data as Blob;
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
    });
  }

  /**
   * Export as PDF
   */
  private static async exportPDF(
    container: HTMLElement,
    nodes: Node[],
    edges: Edge[],
    schema: DatabaseSchema,
    options: ERDExportOptions,
    dimensions: { width: number; height: number }
  ): Promise<ERDExportResult> {
    // For PDF generation, we'll create a comprehensive SVG and provide instructions
    // In a full implementation, you'd use libraries like jsPDF or PDFKit
    
    const svgResult = await this.exportSVG(container, nodes, edges, schema, {
      ...options,
      format: 'svg',
      includeMetadata: true
    }, dimensions);

    if (!svgResult.success) {
      throw new Error('Failed to generate SVG for PDF export');
    }

    // Create a simple PDF-like structure (placeholder implementation)
    const pdfContent = this.generatePDFContent(schema, svgResult.data as Blob, options);
    const blob = new Blob([pdfContent], { type: 'application/pdf' });

    return {
      success: true,
      data: blob,
      filename: `${schema.name}_erd.pdf`,
      format: 'pdf',
      size: blob.size,
      dimensions
    };
  }

  /**
   * Create SVG node element
   */
  private static createSVGNode(node: Node, options: ERDExportOptions): SVGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'table-node');
    group.setAttribute('transform', `translate(${node.position.x}, ${node.position.y})`);

    const table = node.data?.table as any;
    if (!table || !table.columns) return group;

    // Node background
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', '250');
    background.setAttribute('height', `${Math.max(150, 40 + table.columns.length * 25)}`);
    background.setAttribute('rx', '8');
    background.setAttribute('class', 'table-background');
    group.appendChild(background);

    // Table header
    const headerRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    headerRect.setAttribute('width', '250');
    headerRect.setAttribute('height', '40');
    headerRect.setAttribute('rx', '8 8 0 0');
    headerRect.setAttribute('class', 'table-header');
    group.appendChild(headerRect);

    // Table name
    const tableName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tableName.setAttribute('x', '125');
    tableName.setAttribute('y', '25');
    tableName.setAttribute('class', 'table-name');
    tableName.setAttribute('text-anchor', 'middle');
    tableName.textContent = table.name;
    group.appendChild(tableName);

    // Columns
    table.columns.forEach((column: any, index: number) => {
      const columnGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      columnGroup.setAttribute('class', 'column');
      
      const y = 60 + index * 25;

      // Column name
      const columnName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      columnName.setAttribute('x', '10');
      columnName.setAttribute('y', y.toString());
      columnName.setAttribute('class', 'column-name');
      columnName.textContent = column.name;
      columnGroup.appendChild(columnName);

      // Column type
      const columnType = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      columnType.setAttribute('x', '240');
      columnType.setAttribute('y', y.toString());
      columnType.setAttribute('class', 'column-type');
      columnType.setAttribute('text-anchor', 'end');
      columnType.textContent = column.type;
      columnGroup.appendChild(columnType);

      // Primary key indicator
      if (column.primaryKey) {
        const pkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pkIcon.setAttribute('cx', '230');
        pkIcon.setAttribute('cy', (y - 5).toString());
        pkIcon.setAttribute('r', '3');
        pkIcon.setAttribute('class', 'primary-key');
        columnGroup.appendChild(pkIcon);
      }

      group.appendChild(columnGroup);
    });

    return group;
  }

  /**
   * Create SVG edge element
   */
  private static createSVGEdge(edge: Edge, nodes: Node[], options: ERDExportOptions): SVGElement {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) {
      return document.createElementNS('http://www.w3.org/2000/svg', 'g');
    }

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'relationship-edge');

    // Calculate connection points
    const sourceX = sourceNode.position.x + 250;
    const sourceY = sourceNode.position.y + 70;
    const targetX = targetNode.position.x;
    const targetY = targetNode.position.y + 70;

    // Create path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = this.createBezierPath(sourceX, sourceY, targetX, targetY);
    path.setAttribute('d', pathData);
    path.setAttribute('class', 'relationship-line');
    path.setAttribute('fill', 'none');
    group.appendChild(path);

    // Add relationship markers
    const relationshipType = edge.data?.relationshipType || 'one-to-many';
    
    // Source marker (one side)
    if ((relationshipType as string).includes('one')) {
      const sourceMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      sourceMarker.setAttribute('cx', sourceX.toString());
      sourceMarker.setAttribute('cy', sourceY.toString());
      sourceMarker.setAttribute('r', '4');
      sourceMarker.setAttribute('class', 'relationship-marker');
      group.appendChild(sourceMarker);
    }

    // Target marker (many side for one-to-many)
    if ((relationshipType as string).includes('many')) {
      const targetMarker = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      targetMarker.setAttribute('d', `M${targetX - 8},${targetY - 4} L${targetX},${targetY} L${targetX - 8},${targetY + 4}`);
      targetMarker.setAttribute('class', 'relationship-marker');
      targetMarker.setAttribute('fill', 'none');
      group.appendChild(targetMarker);
    }

    return group;
  }

  /**
   * Generate SVG styles based on theme
   */
  private static generateSVGStyles(theme: string): string {
    const themes = {
      default: `
        .table-background { fill: #1f2937; stroke: #374151; stroke-width: 1; }
        .table-header { fill: #374151; }
        .table-name { fill: white; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; }
        .column-name { fill: #e5e7eb; font-family: Arial, sans-serif; font-size: 12px; }
        .column-type { fill: #9ca3af; font-family: Arial, sans-serif; font-size: 10px; }
        .primary-key { fill: #fbbf24; }
        .relationship-line { stroke: #f97316; stroke-width: 2; }
        .relationship-marker { stroke: #f97316; stroke-width: 2; fill: white; }
      `,
      modern: `
        .table-background { fill: white; stroke: #e5e7eb; stroke-width: 1; }
        .table-header { fill: #3b82f6; }
        .table-name { fill: white; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; }
        .column-name { fill: #1f2937; font-family: Arial, sans-serif; font-size: 12px; }
        .column-type { fill: #6b7280; font-family: Arial, sans-serif; font-size: 10px; }
        .primary-key { fill: #fbbf24; }
        .relationship-line { stroke: #3b82f6; stroke-width: 2; }
        .relationship-marker { stroke: #3b82f6; stroke-width: 2; fill: white; }
      `,
      minimal: `
        .table-background { fill: white; stroke: #000000; stroke-width: 1; }
        .table-header { fill: #f3f4f6; }
        .table-name { fill: #000000; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; }
        .column-name { fill: #000000; font-family: Arial, sans-serif; font-size: 12px; }
        .column-type { fill: #6b7280; font-family: Arial, sans-serif; font-size: 10px; }
        .primary-key { fill: #000000; }
        .relationship-line { stroke: #000000; stroke-width: 1; }
        .relationship-marker { stroke: #000000; stroke-width: 1; fill: white; }
      `,
      colorful: `
        .table-background { fill: white; stroke: #a855f7; stroke-width: 2; }
        .table-header { fill: linear-gradient(to right, #a855f7, #ec4899); }
        .table-name { fill: white; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; }
        .column-name { fill: #1f2937; font-family: Arial, sans-serif; font-size: 12px; }
        .column-type { fill: #6b7280; font-family: Arial, sans-serif; font-size: 10px; }
        .primary-key { fill: #fbbf24; }
        .relationship-line { stroke: #a855f7; stroke-width: 2; }
        .relationship-marker { stroke: #a855f7; stroke-width: 2; fill: white; }
      `
    };

    return themes[theme as keyof typeof themes] || themes.default;
  }

  /**
   * Create bezier path for edge connections
   */
  private static createBezierPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = Math.abs(x2 - x1);
    const controlPointOffset = Math.min(dx / 2, 100);
    
    const cp1x = x1 + controlPointOffset;
    const cp1y = y1;
    const cp2x = x2 - controlPointOffset;
    const cp2y = y2;

    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  }

  /**
   * Create SVG metadata element
   */
  private static createSVGMetadata(schema: DatabaseSchema, options: ERDExportOptions): SVGElement {
    const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    metadata.setAttribute('class', 'metadata');
    metadata.setAttribute('transform', 'translate(20, 20)');

    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', '200');
    background.setAttribute('height', '100');
    background.setAttribute('fill', 'rgba(0, 0, 0, 0.1)');
    background.setAttribute('rx', '5');
    metadata.appendChild(background);

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', '10');
    title.setAttribute('y', '20');
    title.setAttribute('font-family', 'Arial, sans-serif');
    title.setAttribute('font-size', '12');
    title.setAttribute('font-weight', 'bold');
    title.textContent = schema.name;
    metadata.appendChild(title);

    const stats = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    stats.setAttribute('x', '10');
    stats.setAttribute('y', '40');
    stats.setAttribute('font-family', 'Arial, sans-serif');
    stats.setAttribute('font-size', '10');
    stats.textContent = `Tables: ${schema.tables.length}`;
    metadata.appendChild(stats);

    const exported = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    exported.setAttribute('x', '10');
    exported.setAttribute('y', '55');
    exported.setAttribute('font-family', 'Arial, sans-serif');
    exported.setAttribute('font-size', '10');
    exported.textContent = `Exported: ${new Date().toLocaleDateString()}`;
    metadata.appendChild(exported);

    return metadata;
  }

  /**
   * Create SVG watermark
   */
  private static createSVGWatermark(
    watermark: NonNullable<ERDExportOptions['watermark']>,
    dimensions: { width: number; height: number }
  ): SVGElement {
    const watermarkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    watermarkGroup.setAttribute('class', 'watermark');
    watermarkGroup.setAttribute('opacity', watermark.opacity.toString());

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('font-size', '24');
    text.setAttribute('fill', '#999999');
    text.textContent = watermark.text;

    // Position based on watermark.position
    let x = 20, y = 30;
    switch (watermark.position) {
      case 'top-right':
        x = dimensions.width - 20;
        y = 30;
        text.setAttribute('text-anchor', 'end');
        break;
      case 'bottom-left':
        x = 20;
        y = dimensions.height - 20;
        break;
      case 'bottom-right':
        x = dimensions.width - 20;
        y = dimensions.height - 20;
        text.setAttribute('text-anchor', 'end');
        break;
      case 'center':
        x = dimensions.width / 2;
        y = dimensions.height / 2;
        text.setAttribute('text-anchor', 'middle');
        break;
    }

    text.setAttribute('x', x.toString());
    text.setAttribute('y', y.toString());
    watermarkGroup.appendChild(text);

    return watermarkGroup;
  }

  /**
   * Calculate diagram bounds
   */
  private static calculateBounds(nodes: Node[]): { minX: number; minY: number; maxX: number; maxY: number } {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + 250);
      maxY = Math.max(maxY, node.position.y + 200);
    });

    // Add padding
    const padding = 50;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding
    };
  }

  /**
   * Calculate export dimensions
   */
  private static calculateExportDimensions(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    options: ERDExportOptions
  ): { width: number; height: number } {
    const scale = options.scale || 1;
    let width = (bounds.maxX - bounds.minX) * scale;
    let height = (bounds.maxY - bounds.minY) * scale;

    // Apply paper size constraints if specified
    if (options.paperSize && options.paperSize !== 'Custom') {
      const paperDimensions = this.PAPER_SIZES[options.paperSize];
      const paperWidth = options.orientation === 'landscape' ? paperDimensions.height : paperDimensions.width;
      const paperHeight = options.orientation === 'landscape' ? paperDimensions.width : paperDimensions.height;

      // Apply margins
      const margins = options.margins || { top: 50, right: 50, bottom: 50, left: 50 };
      const availableWidth = paperWidth - margins.left - margins.right;
      const availableHeight = paperHeight - margins.top - margins.bottom;

      // Scale to fit paper if necessary
      const scaleX = availableWidth / width;
      const scaleY = availableHeight / height;
      const fitScale = Math.min(scaleX, scaleY, 1);

      width = paperWidth;
      height = paperHeight;
    }

    return { width, height };
  }

  /**
   * Generate PDF content (placeholder implementation)
   */
  private static generatePDFContent(
    schema: DatabaseSchema,
    svgBlob: Blob,
    options: ERDExportOptions
  ): string {
    // This is a simplified PDF structure - in production, use a proper PDF library
    return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(${schema.name} ERD) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000218 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
310
%%EOF`;
  }

  /**
   * Download exported file
   */
  static downloadExport(result: ERDExportResult): void {
    if (!result.success || !result.data) {
      console.error('Cannot download failed export');
      return;
    }

    const blob = result.data as Blob;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
