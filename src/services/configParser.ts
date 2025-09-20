// Configuration Parser Service
// Parses configuration files to extract database connection information

// Define interfaces locally
export interface ConfigFile {
  id: string;
  name: string;
  type: 'env' | 'json' | 'yaml' | 'php' | 'py' | 'js' | 'ts';
  path: string;
  databaseConfig?: DatabaseConfig;
}

export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  type?: string;
  connectionString?: string;
}

export class ConfigParser {
  private readonly CONFIG_PATTERNS = {
    env: {
      database: /DATABASE_(URL|HOST|PORT|NAME|USER|PASSWORD|TYPE)\s*=\s*(.+)/gi,
      db: /DB_(HOST|PORT|DATABASE|USERNAME|PASSWORD|CONNECTION)\s*=\s*(.+)/gi,
      mysql: /MYSQL_(HOST|PORT|DATABASE|USER|PASSWORD)\s*=\s*(.+)/gi,
      postgres: /POSTGRES_(HOST|PORT|DATABASE|USER|PASSWORD)\s*=\s*(.+)/gi,
      sqlite: /SQLITE_(DATABASE|PATH)\s*=\s*(.+)/gi
    },
    json: {
      database: /"database"\s*:\s*\{([^}]+)\}/gi,
      connection: /"connection"\s*:\s*\{([^}]+)\}/gi,
      db: /"db"\s*:\s*\{([^}]+)\}/gi
    },
    yaml: {
      database: /database:\s*\n\s*([\s\S]*?)(?=\n\w+:|$)/gi,
      db: /db:\s*\n\s*([\s\S]*?)(?=\n\w+:|$)/gi
    },
    js: {
      database: /database:\s*\{([^}]+)\}/gi,
      connection: /connection:\s*\{([^}]+)\}/gi,
      db: /db:\s*\{([^}]+)\}/gi
    },
    ts: {
      database: /database:\s*\{([^}]+)\}/gi,
      connection: /connection:\s*\{([^}]+)\}/gi,
      db: /db:\s*\{([^}]+)\}/gi
    },
    php: {
      database: /'database'\s*=>\s*\[([^\]]+)\]/gi,
      connection: /'connection'\s*=>\s*\[([^\]]+)\]/gi,
      db: /'db'\s*=>\s*\[([^\]]+)\]/gi
    },
    py: {
      database: /DATABASE\s*=\s*\{([^}]+)\}/gi,
      db: /DB\s*=\s*\{([^}]+)\}/gi,
      database_url: /DATABASE_URL\s*=\s*['"]([^'"]+)['"]/gi
    }
  };

  async parseConfigFile(filePath: string, content: string): Promise<ConfigFile | null> {
    try {
      console.log(`🔍 Parsing config file: ${filePath}`);
      
      const fileType = this.detectConfigFileType(filePath);
      if (!fileType) {
        console.warn(`Unknown config file type: ${filePath}`);
        return null;
      }

      const databaseConfig = await this.extractDatabaseConfig(content, fileType);
      if (!databaseConfig) {
        return null;
      }

      return {
        id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: this.extractConfigFileName(filePath),
        type: fileType as 'env' | 'json' | 'yaml' | 'php' | 'py' | 'js' | 'ts',
        path: filePath,
        databaseConfig
      };

    } catch (error) {
      console.warn(`⚠️ Error parsing config file ${filePath}:`, error);
      return null;
    }
  }

  private detectConfigFileType(filePath: string): string | null {
    const fileName = filePath.split(/[/\\]/).pop()?.toLowerCase() || '';
    
    if (fileName.startsWith('.env')) return 'env';
    if (fileName.endsWith('.json')) return 'json';
    if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) return 'yaml';
    if (fileName.endsWith('.js')) return 'js';
    if (fileName.endsWith('.ts')) return 'ts';
    if (fileName.endsWith('.php')) return 'php';
    if (fileName.endsWith('.py')) return 'py';
    
    return null;
  }

  private async extractDatabaseConfig(content: string, fileType: string): Promise<DatabaseConfig | null> {
    const patterns = this.CONFIG_PATTERNS[fileType as keyof typeof this.CONFIG_PATTERNS];
    if (!patterns) {
      console.warn(`No patterns found for config type: ${fileType}`);
      return null;
    }

    const config: DatabaseConfig = {};

    try {
      switch (fileType) {
        case 'env':
          return this.parseEnvConfig(content, patterns);
        case 'json':
          return this.parseJsonConfig(content, patterns);
        case 'yaml':
          return this.parseYamlConfig(content, patterns);
        case 'js':
        case 'ts':
          return this.parseJsConfig(content, patterns);
        case 'php':
          return this.parsePhpConfig(content, patterns);
        case 'py':
          return this.parsePythonConfig(content, patterns);
        default:
          return null;
      }
    } catch (error) {
      console.warn(`Error parsing ${fileType} config:`, error);
      return null;
    }
  }

  private parseEnvConfig(content: string, patterns: any): DatabaseConfig | null {
    const config: DatabaseConfig = {};
    let match;

    // Parse database URL
    const urlMatch = content.match(/DATABASE_URL\s*=\s*(.+)/i);
    if (urlMatch) {
      config.connectionString = urlMatch[1].trim();
      return config;
    }

    // Parse individual database variables
    while ((match = patterns.database.exec(content)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2].trim().replace(/^['"]|['"]$/g, '');
      
      switch (key) {
        case 'url':
          config.connectionString = value;
          break;
        case 'host':
          config.host = value;
          break;
        case 'port':
          config.port = parseInt(value);
          break;
        case 'name':
          config.database = value;
          break;
        case 'user':
          config.username = value;
          break;
        case 'password':
          config.password = value;
          break;
        case 'type':
          config.type = value;
          break;
      }
    }

    // Parse DB_ prefixed variables
    patterns.db.lastIndex = 0;
    while ((match = patterns.db.exec(content)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2].trim().replace(/^['"]|['"]$/g, '');
      
      switch (key) {
        case 'host':
          config.host = value;
          break;
        case 'port':
          config.port = parseInt(value);
          break;
        case 'database':
          config.database = value;
          break;
        case 'username':
          config.username = value;
          break;
        case 'password':
          config.password = value;
          break;
        case 'connection':
          config.connectionString = value;
          break;
      }
    }

    // Parse MySQL specific variables
    patterns.mysql.lastIndex = 0;
    while ((match = patterns.mysql.exec(content)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2].trim().replace(/^['"]|['"]$/g, '');
      
      switch (key) {
        case 'host':
          config.host = value;
          break;
        case 'port':
          config.port = parseInt(value);
          break;
        case 'database':
          config.database = value;
          break;
        case 'user':
          config.username = value;
          break;
        case 'password':
          config.password = value;
          break;
      }
      
      config.type = 'mysql';
    }

    // Parse PostgreSQL specific variables
    patterns.postgres.lastIndex = 0;
    while ((match = patterns.postgres.exec(content)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2].trim().replace(/^['"]|['"]$/g, '');
      
      switch (key) {
        case 'host':
          config.host = value;
          break;
        case 'port':
          config.port = parseInt(value);
          break;
        case 'database':
          config.database = value;
          break;
        case 'user':
          config.username = value;
          break;
        case 'password':
          config.password = value;
          break;
      }
      
      config.type = 'postgresql';
    }

    // Parse SQLite specific variables
    patterns.sqlite.lastIndex = 0;
    while ((match = patterns.sqlite.exec(content)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2].trim().replace(/^['"]|['"]$/g, '');
      
      if (key === 'database' || key === 'path') {
        config.connectionString = value;
      }
      
      config.type = 'sqlite';
    }

    return Object.keys(config).length > 0 ? config : null;
  }

  private parseJsonConfig(content: string, patterns: any): DatabaseConfig | null {
    const config: DatabaseConfig = {};
    let match;

    // Parse database configuration objects
    while ((match = patterns.database.exec(content)) !== null) {
      const dbConfig = this.parseJsonObject(match[1]);
      Object.assign(config, dbConfig);
    }

    // Parse connection configuration objects
    patterns.connection.lastIndex = 0;
    while ((match = patterns.connection.exec(content)) !== null) {
      const connConfig = this.parseJsonObject(match[1]);
      Object.assign(config, connConfig);
    }

    // Parse db configuration objects
    patterns.db.lastIndex = 0;
    while ((match = patterns.db.exec(content)) !== null) {
      const dbConfig = this.parseJsonObject(match[1]);
      Object.assign(config, dbConfig);
    }

    return Object.keys(config).length > 0 ? config : null;
  }

  private parseYamlConfig(content: string, patterns: any): DatabaseConfig | null {
    const config: DatabaseConfig = {};
    let match;

    // Parse database configuration blocks
    while ((match = patterns.database.exec(content)) !== null) {
      const dbConfig = this.parseYamlObject(match[1]);
      Object.assign(config, dbConfig);
    }

    // Parse db configuration blocks
    patterns.db.lastIndex = 0;
    while ((match = patterns.db.exec(content)) !== null) {
      const dbConfig = this.parseYamlObject(match[1]);
      Object.assign(config, dbConfig);
    }

    return Object.keys(config).length > 0 ? config : null;
  }

  private parseJsConfig(content: string, patterns: any): DatabaseConfig | null {
    const config: DatabaseConfig = {};
    let match;

    // Parse database configuration objects
    while ((match = patterns.database.exec(content)) !== null) {
      const dbConfig = this.parseJsObject(match[1]);
      Object.assign(config, dbConfig);
    }

    // Parse connection configuration objects
    patterns.connection.lastIndex = 0;
    while ((match = patterns.connection.exec(content)) !== null) {
      const connConfig = this.parseJsObject(match[1]);
      Object.assign(config, connConfig);
    }

    // Parse db configuration objects
    patterns.db.lastIndex = 0;
    while ((match = patterns.db.exec(content)) !== null) {
      const dbConfig = this.parseJsObject(match[1]);
      Object.assign(config, dbConfig);
    }

    return Object.keys(config).length > 0 ? config : null;
  }

  private parsePhpConfig(content: string, patterns: any): DatabaseConfig | null {
    const config: DatabaseConfig = {};
    let match;

    // Parse database configuration arrays
    while ((match = patterns.database.exec(content)) !== null) {
      const dbConfig = this.parsePhpArray(match[1]);
      Object.assign(config, dbConfig);
    }

    // Parse connection configuration arrays
    patterns.connection.lastIndex = 0;
    while ((match = patterns.connection.exec(content)) !== null) {
      const connConfig = this.parsePhpArray(match[1]);
      Object.assign(config, connConfig);
    }

    // Parse db configuration arrays
    patterns.db.lastIndex = 0;
    while ((match = patterns.db.exec(content)) !== null) {
      const dbConfig = this.parsePhpArray(match[1]);
      Object.assign(config, dbConfig);
    }

    return Object.keys(config).length > 0 ? config : null;
  }

  private parsePythonConfig(content: string, patterns: any): DatabaseConfig | null {
    const config: DatabaseConfig = {};
    let match;

    // Parse database configuration dictionaries
    while ((match = patterns.database.exec(content)) !== null) {
      const dbConfig = this.parsePythonDict(match[1]);
      Object.assign(config, dbConfig);
    }

    // Parse db configuration dictionaries
    patterns.db.lastIndex = 0;
    while ((match = patterns.db.exec(content)) !== null) {
      const dbConfig = this.parsePythonDict(match[1]);
      Object.assign(config, dbConfig);
    }

    // Parse DATABASE_URL
    const urlMatch = content.match(/DATABASE_URL\s*=\s*['"]([^'"]+)['"]/i);
    if (urlMatch) {
      config.connectionString = urlMatch[1];
    }

    return Object.keys(config).length > 0 ? config : null;
  }

  // Helper methods for parsing different object formats
  private parseJsonObject(objString: string): DatabaseConfig {
    const config: DatabaseConfig = {};
    
    // Simple JSON object parsing (not using JSON.parse for safety)
    const pairs = objString.match(/"([^"]+)"\s*:\s*"([^"]+)"/g);
    if (pairs) {
      for (const pair of pairs) {
        const [, key, value] = pair.match(/"([^"]+)"\s*:\s*"([^"]+)"/) || [];
        if (key && value) {
          this.mapConfigKey(key, value, config);
        }
      }
    }

    return config;
  }

  private parseYamlObject(objString: string): DatabaseConfig {
    const config: DatabaseConfig = {};
    const lines = objString.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          const key = trimmed.substring(0, colonIndex).trim();
          const value = trimmed.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');
          this.mapConfigKey(key, value, config);
        }
      }
    }

    return config;
  }

  private parseJsObject(objString: string): DatabaseConfig {
    const config: DatabaseConfig = {};
    
    // Simple JavaScript object parsing
    const pairs = objString.match(/(\w+)\s*:\s*['"]([^'"]+)['"]/g);
    if (pairs) {
      for (const pair of pairs) {
        const [, key, value] = pair.match(/(\w+)\s*:\s*['"]([^'"]+)['"]/) || [];
        if (key && value) {
          this.mapConfigKey(key, value, config);
        }
      }
    }

    return config;
  }

  private parsePhpArray(arrayString: string): DatabaseConfig {
    const config: DatabaseConfig = {};
    
    // Simple PHP array parsing
    const pairs = arrayString.match(/'([^']+)'\s*=>\s*['"]([^'"]+)['"]/g);
    if (pairs) {
      for (const pair of pairs) {
        const [, key, value] = pair.match(/'([^']+)'\s*=>\s*['"]([^'"]+)['"]/) || [];
        if (key && value) {
          this.mapConfigKey(key, value, config);
        }
      }
    }

    return config;
  }

  private parsePythonDict(dictString: string): DatabaseConfig {
    const config: DatabaseConfig = {};
    
    // Simple Python dictionary parsing
    const pairs = dictString.match(/'([^']+)'\s*:\s*['"]([^'"]+)['"]/g);
    if (pairs) {
      for (const pair of pairs) {
        const [, key, value] = pair.match(/'([^']+)'\s*:\s*['"]([^'"]+)['"]/) || [];
        if (key && value) {
          this.mapConfigKey(key, value, config);
        }
      }
    }

    return config;
  }

  private mapConfigKey(key: string, value: string, config: DatabaseConfig): void {
    const lowerKey = key.toLowerCase();
    
    switch (lowerKey) {
      case 'host':
      case 'hostname':
        config.host = value;
        break;
      case 'port':
        config.port = parseInt(value);
        break;
      case 'database':
      case 'dbname':
      case 'name':
        config.database = value;
        break;
      case 'username':
      case 'user':
      case 'login':
        config.username = value;
        break;
      case 'password':
      case 'pass':
      case 'pwd':
        config.password = value;
        break;
      case 'type':
      case 'driver':
      case 'engine':
        config.type = value;
        break;
      case 'url':
      case 'connectionstring':
      case 'connection_string':
        config.connectionString = value;
        break;
    }
  }

  private extractConfigFileName(filePath: string): string {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    return fileName.replace(/\.[^/.]+$/, '');
  }
}

export default ConfigParser;
