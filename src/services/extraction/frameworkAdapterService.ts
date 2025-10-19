// Framework Adapter Service
// Stage 4: Framework-specific adapters to extract database definitions

import {
  ExtractionCandidate,
  ExtractionOptions,
  IRTable,
  FrameworkAdapter,
  SupportedFramework,
  SupportedLanguage,
  FileInfo,
  FileContent
} from '@/types/extraction';

import { SequelizeAdapter } from './adapters/sequelizeAdapter';
import { PrismaAdapter } from './adapters/prismaAdapter';
import { MongooseAdapter } from './adapters/mongooseAdapter';
import { TypeORMAdapter } from './adapters/typeormAdapter';
import { DjangoAdapter } from './adapters/djangoAdapter';
import { SQLAlchemyAdapter } from './adapters/sqlalchemyAdapter';
import { AlembicAdapter } from './adapters/alembicAdapter';
import { LaravelAdapter } from './adapters/laravelAdapter';
import { EloquentAdapter } from './adapters/eloquentAdapter';
import { HibernateAdapter } from './adapters/hibernateAdapter';
import { JPAAdapter } from './adapters/jpaAdapter';
import { SpringDataAdapter } from './adapters/springDataAdapter';

export class FrameworkAdapterService {
  private adapters: Map<SupportedFramework, FrameworkAdapter>;

  constructor() {
    this.adapters = new Map();
    this.initializeAdapters();
  }

  /**
   * Extract database definitions from all candidates using appropriate adapters
   */
  async extractAll(candidates: ExtractionCandidate[], options: ExtractionOptions): Promise<IRTable[]> {
    const startTime = Date.now();
    console.log(`🏗️  Extracting definitions from ${candidates.length} candidates...`);

    const tables: IRTable[] = [];
    const errors: Array<{framework: string, error: Error, candidateCount: number}> = [];

    // Group candidates by framework for efficient processing
    const candidatesByFramework = this.groupCandidatesByFramework(candidates);

    for (const [framework, frameworkCandidates] of candidatesByFramework) {
      const adapter = this.adapters.get(framework);
      if (!adapter) {
        console.warn(`No adapter available for framework: ${framework}`);
        continue;
      }

      console.log(`🔧 Processing ${frameworkCandidates.length} ${framework} candidates...`);

      try {
        // Process candidates with the appropriate adapter
        const extractedTables = await adapter.parseToIR(frameworkCandidates);
        tables.push(...extractedTables);

        console.log(`✅ Extracted ${extractedTables.length} tables from ${framework}`);
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Unknown error');
        console.error(`❌ Framework adapter ${framework} failed:`, errorObj.message);
        errors.push({
          framework,
          error: errorObj,
          candidateCount: frameworkCandidates.length
        });
      }
    }

    const extractTime = Date.now() - startTime;
    console.log(`🏗️  Extracted ${tables.length} total tables in ${extractTime}ms`);

    // Report adapter errors if any
    if (errors.length > 0) {
      console.warn(`⚠️  ${errors.length} adapter(s) failed during extraction:`);
      errors.forEach(({framework, error, candidateCount}) => {
        console.warn(`  - ${framework}: ${error.message} (${candidateCount} candidates affected)`);
      });
    }

    return tables;
  }

  /**
   * Get the best adapter for a specific file
   */
  getBestAdapter(file: FileInfo, content: string): FrameworkAdapter | null {
    let bestAdapter: FrameworkAdapter | null = null;
    let highestConfidence = 0;

    for (const adapter of this.adapters.values()) {
      if (adapter.canHandle(file, content)) {
        const confidence = adapter.detectFramework(file, content);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestAdapter = adapter;
        }
      }
    }

    return bestAdapter;
  }

  /**
   * Extract definitions from a single file
   */
  async extractFromFile(fileContent: FileContent): Promise<IRTable[]> {
    const adapter = this.getBestAdapter(fileContent.info, fileContent.content);
    if (!adapter) {
      return [];
    }

    try {
      const candidates = await adapter.extractDefinitions(fileContent);
      return await adapter.parseToIR(candidates);
    } catch (error) {
      console.error(`Failed to extract from file ${fileContent.info.path}:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  /**
   * Validate extraction candidate against framework adapters
   */
  validateCandidate(candidate: ExtractionCandidate): {
    isValid: boolean;
    confidence: number;
    suggestedFramework?: SupportedFramework;
  } {
    if (!candidate.framework) {
      // Try to detect framework from content
      for (const adapter of this.adapters.values()) {
        if (adapter.canHandle(candidate.file, candidate.content)) {
          const confidence = adapter.detectFramework(candidate.file, candidate.content);
          if (confidence > 70) {
            return {
              isValid: true,
              confidence,
              suggestedFramework: adapter.name
            };
          }
        }
      }
      return { isValid: false, confidence: 0 };
    }

    const adapter = this.adapters.get(candidate.framework);
    if (!adapter) {
      return { isValid: false, confidence: 0 };
    }

    const confidence = adapter.detectFramework(candidate.file, candidate.content);
    return {
      isValid: confidence > 60,
      confidence,
      suggestedFramework: candidate.framework
    };
  }

  /**
   * Get supported frameworks
   */
  getSupportedFrameworks(): SupportedFramework[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get adapter by framework name
   */
  getAdapter(framework: SupportedFramework): FrameworkAdapter | null {
    return this.adapters.get(framework) || null;
  }

  /**
   * Get adapter statistics
   */
  getAdapterStatistics(): {
    totalAdapters: number;
    byLanguage: Record<SupportedLanguage, number>;
    byFramework: Record<SupportedFramework, number>;
  } {
    const stats = {
      totalAdapters: this.adapters.size,
      byLanguage: {} as Record<SupportedLanguage, number>,
      byFramework: {} as Record<SupportedFramework, number>
    };

    for (const [framework, adapter] of this.adapters) {
      stats.byFramework[framework] = 1;
      
      const language = adapter.language;
      stats.byLanguage[language] = (stats.byLanguage[language] || 0) + 1;
    }

    return stats;
  }

  /**
   * Test all adapters with sample content
   */
  async testAdapters(): Promise<{
    framework: SupportedFramework;
    working: boolean;
    error?: string;
  }[]> {
    const results: {
      framework: SupportedFramework;
      working: boolean;
      error?: string;
    }[] = [];

    for (const [framework, adapter] of this.adapters) {
      try {
        // Create a minimal test case
        const testFile: FileInfo = {
          path: `test.${adapter.extensions[0]}`,
          name: `test.${adapter.extensions[0]}`,
          extension: adapter.extensions[0],
          size: 100,
          mimeType: 'text/plain',
          hash: 'test',
          language: adapter.language,
          framework,
          lastModified: new Date(),
          encoding: 'utf8'
        };

        const testContent = this.generateTestContent(framework);
        const canHandle = adapter.canHandle(testFile, testContent);
        
        results.push({
          framework,
          working: canHandle,
          error: canHandle ? undefined : 'Cannot handle test content'
        });
      } catch (error) {
        results.push({
          framework,
          working: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  // Private methods

  /**
   * Group candidates by framework
   */
  private groupCandidatesByFramework(candidates: ExtractionCandidate[]): Map<SupportedFramework, ExtractionCandidate[]> {
    const grouped = new Map<SupportedFramework, ExtractionCandidate[]>();

    for (const candidate of candidates) {
      if (candidate.framework) {
        if (!grouped.has(candidate.framework)) {
          grouped.set(candidate.framework, []);
        }
        grouped.get(candidate.framework)!.push(candidate);
      } else {
        // Try to detect framework from content
        const adapter = this.getBestAdapter(candidate.file, candidate.content);
        if (adapter) {
          const framework = adapter.name;
          if (!grouped.has(framework)) {
            grouped.set(framework, []);
          }
          grouped.get(framework)!.push({
            ...candidate,
            framework
          });
        }
      }
    }

    return grouped;
  }

  /**
   * Initialize all framework adapters
   */
  private initializeAdapters(): void {
    // JavaScript/TypeScript adapters
    this.adapters.set('sequelize', new SequelizeAdapter());
    this.adapters.set('prisma', new PrismaAdapter());
    this.adapters.set('mongoose', new MongooseAdapter());
    this.adapters.set('typeorm', new TypeORMAdapter());

    // Python adapters
    this.adapters.set('django', new DjangoAdapter());
    this.adapters.set('sqlalchemy', new SQLAlchemyAdapter());
    this.adapters.set('alembic', new AlembicAdapter());

    // PHP adapters
    this.adapters.set('laravel', new LaravelAdapter());
    this.adapters.set('eloquent', new EloquentAdapter());

    // Java adapters
    this.adapters.set('hibernate', new HibernateAdapter());
    this.adapters.set('jpa', new JPAAdapter());
    this.adapters.set('spring-data', new SpringDataAdapter());
  }

  /**
   * Generate test content for a framework
   */
  private generateTestContent(framework: SupportedFramework): string {
    const testContent: Record<SupportedFramework, string> = {
      'sequelize': `
        const User = sequelize.define('User', {
          id: DataTypes.INTEGER,
          name: DataTypes.STRING
        });
      `,
      'prisma': `
        model User {
          id   Int    @id @default(autoincrement())
          name String
        }
      `,
      'mongoose': `
        const userSchema = new mongoose.Schema({
          name: String,
          email: String
        });
      `,
      'typeorm': `
        @Entity()
        export class User {
          @PrimaryGeneratedColumn()
          id: number;
          
          @Column()
          name: string;
        }
      `,
      'django': `
        class User(models.Model):
            name = models.CharField(max_length=100)
            email = models.EmailField()
      `,
      'sqlalchemy': `
        class User(Base):
            __tablename__ = 'users'
            id = Column(Integer, primary_key=True)
            name = Column(String(100))
      `,
      'alembic': `
        def upgrade():
            op.create_table('users',
                sa.Column('id', sa.Integer(), nullable=False),
                sa.Column('name', sa.String(100), nullable=True)
            )
      `,
      'laravel': `
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });
      `,
      'eloquent': `
        class User extends Model
        {
            protected $fillable = ['name', 'email'];
        }
      `,
      'hibernate': `
        @Entity
        @Table(name = "users")
        public class User {
            @Id
            @GeneratedValue(strategy = GenerationType.IDENTITY)
            private Long id;
            
            @Column(name = "name")
            private String name;
        }
      `,
      'jpa': `
        @Entity
        public class User {
            @Id
            private Long id;
            
            @Column
            private String name;
        }
      `,
      'spring-data': `
        @Repository
        public interface UserRepository extends JpaRepository<User, Long> {
            List<User> findByName(String name);
        }
      `
    };

    return testContent[framework] || '';
  }
}
