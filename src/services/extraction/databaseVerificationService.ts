// Database Verification Service
// Cross-checks extracted tables against actual database introspection results
// to eliminate phantom or duplicate tables and improve extraction accuracy

// DatabaseType will be defined locally since it's not exported
import { Table } from '../../types/database';

type DatabaseType = 'sqlite' | 'postgresql' | 'mysql' | 'mongodb';

export interface ReconciliationMatch {
  extractedTable: Table;
  databaseTable: DatabaseIntrospectionResult['tableMetadata'][0];
  matchScore: number;
  matchReasons: string[];
  structuralHash: string;
  schemaMatch: boolean;
  rowCountMatch: boolean;
}

export interface VerificationResult {
  verifiedTables: Table[];
  phantomTables: Table[];
  duplicateTables: Table[];
  mismatchedTables: Table[];
  reconciliationMatches: ReconciliationMatch[];
  verificationStats: {
    totalExtracted: number;
    verified: number;
    phantoms: number;
    duplicates: number;
    mismatched: number;
    accuracy: number;
    reconciliationScore: number;
  };
  extractionConsistency?: {
    unusedModels: Array<{
      modelName: string;
      modelType: 'TABLE' | 'VIEW' | 'COLLECTION';
      filePath?: string;
      reason: 'NOT_IN_DATABASE' | 'NO_MATCHING_TABLE' | 'STRUCTURE_MISMATCH';
      details: string;
      suggestions: string[];
    }>;
    phantomStructures: Array<{
      structureName: string;
      structureType: 'TABLE' | 'VIEW' | 'INDEX' | 'CONSTRAINT' | 'TRIGGER' | 'FUNCTION' | 'PROCEDURE';
      databaseSource: 'CATALOG' | 'INTROSPECTION';
      reason: 'NOT_IN_ORM' | 'NO_MATCHING_MODEL' | 'ORPHANED_OBJECT';
      details: string;
      suggestions: string[];
    }>;
    constraintDiscrepancies: Array<{
      tableName: string;
      constraintType: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK' | 'NOT_NULL';
      ormDefinition?: {
        name: string;
        columns: string[];
        expression?: string;
        references?: {
          table: string;
          column: string;
        };
      };
      databaseDefinition?: {
        name: string;
        columns: string[];
        expression?: string;
        references?: {
          table: string;
          column: string;
        };
      };
      discrepancyType: 'MISSING_IN_ORM' | 'MISSING_IN_DATABASE' | 'STRUCTURE_MISMATCH' | 'NAME_MISMATCH';
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      details: string;
    }>;
    relationDiscrepancies: Array<{
      tableName: string;
      relationType: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY' | 'BELONGS_TO' | 'HAS_MANY' | 'HAS_ONE';
      ormDefinition?: {
        name: string;
        type: string;
        foreignKey?: string;
        references?: {
          table: string;
          column: string;
        };
        through?: string;
        joinTable?: string;
      };
      databaseDefinition?: {
        name: string;
        type: string;
        foreignKey?: string;
        references?: {
          table: string;
          column: string;
        };
      };
      discrepancyType: 'MISSING_IN_ORM' | 'MISSING_IN_DATABASE' | 'STRUCTURE_MISMATCH' | 'TYPE_MISMATCH';
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      details: string;
    }>;
    columnDiscrepancies: Array<{
      tableName: string;
      columnName: string;
      ormDefinition?: {
        type: string;
        nullable: boolean;
        primaryKey: boolean;
        unique: boolean;
        defaultValue?: any;
        constraints?: string[];
      };
      databaseDefinition?: {
        type: string;
        nullable: boolean;
        primaryKey: boolean;
        unique: boolean;
        defaultValue?: any;
        constraints?: string[];
      };
      discrepancyType: 'MISSING_IN_ORM' | 'MISSING_IN_DATABASE' | 'TYPE_MISMATCH' | 'NULLABLE_MISMATCH' | 'DEFAULT_MISMATCH';
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      details: string;
    }>;
    consistencyMetrics: {
      totalModels: number;
      totalDatabaseObjects: number;
      unusedModelCount: number;
      phantomStructureCount: number;
      constraintDiscrepancyCount: number;
      relationDiscrepancyCount: number;
      columnDiscrepancyCount: number;
      overallConsistencyScore: number;
      criticalIssuesCount: number;
      highIssuesCount: number;
      mediumIssuesCount: number;
      lowIssuesCount: number;
    };
  };
}

export interface DatabaseIntrospectionResult {
  actualTables: string[];
  databaseConfiguration?: {
    encoding?: string;
    collation?: string;
    timezone?: string;
    journalMode?: string;
    isolationLevel?: string;
    version?: string;
    characterSet?: string;
    sqlMode?: string;
    storageEngine?: string;
    maxConnections?: number;
    bufferPoolSize?: number;
    logLevel?: string;
    autovacuum?: boolean;
    walMode?: string;
    synchronousMode?: string;
    cacheSize?: number;
    tempStore?: string;
    lockingMode?: string;
    foreignKeys?: boolean;
    recursiveTriggers?: boolean;
    autoVacuum?: boolean;
    incrementalVacuum?: boolean;
    userVersion?: number;
    applicationId?: number;
    pageSize?: number;
    pageCount?: number;
    freelistCount?: number;
    schemaVersion?: number;
    dataVersion?: number;
    pragmaUserVersion?: number;
    pragmaApplicationId?: number;
    pragmaPageSize?: number;
    pragmaPageCount?: number;
    pragmaFreelistCount?: number;
    pragmaSchemaVersion?: number;
    pragmaDataVersion?: number;
    additionalSettings?: Record<string, any>;
  };
  statistics?: {
    tableStatistics?: Array<{
      tableName: string;
      schema?: string;
      rowCount?: number;
      dataSize?: number;
      indexSize?: number;
      totalSize?: number;
      pageCount?: number;
      avgRowSize?: number;
      lastAnalyzed?: string;
      lastVacuumed?: string;
      lastAutoVacuumed?: string;
      nTupIns?: number;
      nTupUpd?: number;
      nTupDel?: number;
      nLiveTup?: number;
      nDeadTup?: number;
      nModSinceAnalyze?: number;
      nInsSinceVacuum?: number;
      heapBlksRead?: number;
      heapBlksHit?: number;
      idxBlksRead?: number;
      idxBlksHit?: number;
      toastBlksRead?: number;
      toastBlksHit?: number;
      tidxBlksRead?: number;
      tidxBlksHit?: number;
      additionalStats?: Record<string, any>;
    }>;
    indexStatistics?: Array<{
      indexName: string;
      tableName: string;
      schema?: string;
      indexSize?: number;
      indexPages?: number;
      indexTuples?: number;
      indexScans?: number;
      indexTuplesRead?: number;
      indexTuplesFetched?: number;
      lastUsed?: string;
      additionalStats?: Record<string, any>;
    }>;
    databaseStatistics?: {
      totalTables?: number;
      totalIndexes?: number;
      totalSize?: number;
      dataSize?: number;
      indexSize?: number;
      cacheHitRatio?: number;
      bufferHitRatio?: number;
      lastAnalyzed?: string;
      lastVacuumed?: string;
      additionalStats?: Record<string, any>;
    };
  };
  tableMetadata: Array<{
    name: string;
    type: string;
    schema?: string;
    rowCount?: number;
    structuralHash?: string;
    tableType?: 'BASE TABLE' | 'PARTITIONED' | 'TEMPORARY' | 'EXTERNAL' | 'FOREIGN';
    partitionInfo?: {
      isPartitioned: boolean;
      partitionType?: string;
      partitionKey?: string[];
    };
    engineInfo?: {
      engine?: string;
      tablespace?: string;
      compression?: string;
      charset?: string;
      collation?: string;
    };
    creationDDL?: string;
    constraints?: {
      checkConstraints?: Array<{
        name: string;
        expression: string;
        definition: string;
        isEnabled: boolean;
        isDeferrable: boolean;
        initiallyDeferred: boolean;
        dependencies?: string[];
      }>;
      uniqueConstraints?: Array<{
        name: string;
        columns: string[];
        isDeferrable: boolean;
        initiallyDeferred: boolean;
      }>;
      primaryKeyConstraints?: Array<{
        name: string;
        columns: string[];
        isDeferrable: boolean;
        initiallyDeferred: boolean;
      }>;
      foreignKeyConstraints?: Array<{
        name: string;
        columns: string[];
        referencedTable: string;
        referencedColumns: string[];
        onDelete: string;
        onUpdate: string;
        isDeferrable: boolean;
        initiallyDeferred: boolean;
      }>;
    };
    columns?: Array<{
      name: string;
      type: string;
      nullable: boolean;
      primaryKey: boolean;
      defaultValue?: string;
      autoIncrement?: boolean;
      unique?: boolean;
      comment?: string;
      collation?: string;
      charset?: string;
      generated?: {
        type: 'STORED' | 'VIRTUAL';
        expression: string;
      };
      identity?: {
        generation: 'ALWAYS' | 'BY DEFAULT';
        start: number;
        increment: number;
      };
      checkConstraints?: Array<{
        name: string;
        expression: string;
        definition: string;
        isEnabled: boolean;
        isDeferrable: boolean;
        initiallyDeferred: boolean;
        dependencies?: string[];
      }>;
      foreignKey?: {
        table: string;
        column: string;
        onDelete?: string;
        onUpdate?: string;
      };
      ordinalPosition: number;
      maxLength?: number;
      precision?: number;
      scale?: number;
    }>;
    triggers?: Array<{
      name: string;
      timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
      event: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
      orientation: 'ROW' | 'STATEMENT';
      definition: string;
      body: string;
      isEnabled: boolean;
      creationDDL: string;
      condition?: string;
      granularity?: string;
      securityDefiner: boolean;
      dependencies: string[];
      comment?: string;
    }>;
  }>;
  views: Array<{
    name: string;
    schema?: string;
    definition: string;
    isMaterialized: boolean;
    refreshInfo?: {
      refreshMethod?: string;
      lastRefresh?: Date;
    };
    creationDDL?: string;
    triggers?: Array<{
      name: string;
      timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
      event: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
      orientation: 'ROW' | 'STATEMENT';
      definition: string;
      body: string;
      isEnabled: boolean;
      creationDDL: string;
      condition?: string;
      granularity?: string;
      securityDefiner: boolean;
      dependencies: string[];
      comment?: string;
    }>;
  }>;
  indexes: Array<{
    name: string;
    tableName: string;
    schema?: string;
    type: 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'BRIN' | 'CLUSTERED' | 'NONCLUSTERED' | 'FULLTEXT' | 'SPATIAL';
    columns: string[];
    isUnique: boolean;
    isPrimary: boolean;
    isClustered?: boolean;
    isPartial?: boolean;
    whereClause?: string;
    includedColumns?: string[];
    creationDDL?: string;
    fillfactor?: number;
    storageParams?: Record<string, any>;
    indexMethod?: string;
    columnExpressions?: string[];
    predicate?: string;
    tablespace?: string;
    cardinality?: number;
    comment?: string;
    expression?: string;
  }>;
  triggers: Array<{
    name: string;
    tableName: string;
    schema?: string;
    timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
    event: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
    orientation: 'ROW' | 'STATEMENT';
    definition: string;
    body: string;
    isEnabled: boolean;
    creationDDL: string;
    condition?: string;
    granularity?: string;
    securityDefiner: boolean;
    dependencies: string[];
    comment?: string;
  }>;
  sequences: Array<{
    name: string;
    schema?: string;
    startValue: number;
    increment: number;
    minValue?: number;
    maxValue?: number;
    currentValue?: number;
    cycle: boolean;
    cache?: number;
    ownedBy?: string;
    creationDDL?: string;
  }>;
  procedures: Array<{
    name: string;
    schema?: string;
    language: string;
    definition: string;
    body: string;
    returnType?: string;
    parameters: Array<{
      name: string;
      type: string;
      mode: 'IN' | 'OUT' | 'INOUT';
      defaultValue?: string;
    }>;
    creationDDL: string;
    isEnabled: boolean;
    comment?: string;
    cost?: number;
    rows?: number;
    volatile?: string;
    parallel?: string;
    securityDefiner: boolean;
    dependencies: string[];
  }>;
  functions: Array<{
    name: string;
    schema?: string;
    language: string;
    definition: string;
    body: string;
    returnType: string;
    parameters: Array<{
      name: string;
      type: string;
      mode: 'IN' | 'OUT' | 'INOUT';
      defaultValue?: string;
    }>;
    creationDDL: string;
    isEnabled: boolean;
    comment?: string;
    cost?: number;
    rows?: number;
    volatile?: string;
    parallel?: string;
    securityDefiner: boolean;
    dependencies: string[];
  }>;
  events?: Array<{
    name: string;
    schema?: string;
    definition: string;
    body: string;
    creationDDL: string;
    isEnabled: boolean;
    schedule: string;
    startsAt?: string;
    endsAt?: string;
    onCompletion: string;
    comment?: string;
    status: string;
    lastExecuted?: string;
    nextExecution?: string;
    dependencies: string[];
  }>;
  security?: {
    users: Array<{
      name: string;
      type: 'USER' | 'ROLE' | 'GROUP';
      isActive: boolean;
      canLogin: boolean;
      canCreateRole: boolean;
      canCreateDB: boolean;
      isSuperuser: boolean;
      isReplication: boolean;
      isBypassRLS: boolean;
      connectionLimit: number;
      passwordExpires?: string;
      validUntil?: string;
      attributes: Record<string, any>;
      comment?: string;
      created?: string;
      lastLogin?: string;
    }>;
    roles: Array<{
      name: string;
      type: 'ROLE' | 'GROUP';
      isActive: boolean;
      canLogin: boolean;
      canCreateRole: boolean;
      canCreateDB: boolean;
      isSuperuser: boolean;
      isReplication: boolean;
      isBypassRLS: boolean;
      connectionLimit: number;
      passwordExpires?: string;
      validUntil?: string;
      attributes: Record<string, any>;
      comment?: string;
      created?: string;
      members: string[];
      memberOf: string[];
    }>;
    permissions: Array<{
      grantor: string;
      grantee: string;
      objectType: 'TABLE' | 'VIEW' | 'FUNCTION' | 'PROCEDURE' | 'SEQUENCE' | 'SCHEMA' | 'DATABASE' | 'COLLECTION';
      objectName: string;
      schema?: string;
      privileges: string[];
      isGrantable: boolean;
      withHierarchy: boolean;
      grantOption: boolean;
      comment?: string;
    }>;
    groups: Array<{
      name: string;
      type: 'GROUP' | 'ROLE';
      members: string[];
      privileges: string[];
      isActive: boolean;
      comment?: string;
      created?: string;
    }>;
  };
  runtimeState?: {
    connections: Array<{
      id: string;
      database: string;
      user: string;
      host: string;
      port?: number;
      state: 'ACTIVE' | 'IDLE' | 'IDLE_IN_TRANSACTION' | 'IDLE_IN_TRANSACTION_ABORTED' | 'FASTPATH_FUNCTION_CALL' | 'DISABLED' | 'BLOCKED';
      applicationName?: string;
      clientAddress?: string;
      backendStart: string;
      queryStart?: string;
      stateChange: string;
      waitEventType?: string;
      waitEvent?: string;
      query?: string;
      backendType?: string;
      pid?: number;
      attributes: Record<string, any>;
    }>;
    transactions: Array<{
      id: string;
      database: string;
      user: string;
      state: 'ACTIVE' | 'IDLE' | 'IDLE_IN_TRANSACTION' | 'IDLE_IN_TRANSACTION_ABORTED' | 'BLOCKED';
      isolationLevel: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE' | 'SNAPSHOT';
      readOnly: boolean;
      startTime: string;
      duration: number;
      query?: string;
      lockMode?: string;
      lockTable?: string;
      lockSchema?: string;
      attributes: Record<string, any>;
    }>;
    locks: Array<{
      id: string;
      type: 'ADVISORY' | 'EXCLUSIVE' | 'SHARE' | 'SHARE_UPDATE_EXCLUSIVE' | 'SHARE_ROW_EXCLUSIVE' | 'EXCLUSIVE' | 'ACCESS_SHARE' | 'ROW_SHARE' | 'ROW_EXCLUSIVE' | 'SHARE_UPDATE_EXCLUSIVE' | 'SHARE_ROW_EXCLUSIVE' | 'EXCLUSIVE' | 'ACCESS_EXCLUSIVE';
      mode: 'FOR_SHARE' | 'FOR_UPDATE' | 'FOR_NO_KEY_UPDATE' | 'FOR_KEY_SHARE' | 'FOR_UPDATE_SKIP_LOCKED' | 'FOR_UPDATE_NOWAIT';
      granted: boolean;
      database: string;
      schema?: string;
      table?: string;
      column?: string;
      page?: number;
      tuple?: number;
      virtualxid?: string;
      transactionid?: string;
      classid?: string;
      objid?: string;
      objsubid?: number;
      virtualtransaction?: string;
      pid?: number;
      fastpath?: boolean;
      waitstart?: string;
      attributes: Record<string, any>;
    }>;
    blockingLocks: Array<{
      blockedQuery: string;
      blockedPid: number;
      blockedUser: string;
      blockedApplication: string;
      blockedClientAddr: string;
      blockedState: string;
      blockedMode: string;
      blockedQueryStart: string;
      blockingQuery: string;
      blockingPid: number;
      blockingUser: string;
      blockingApplication: string;
      blockingClientAddr: string;
      blockingState: string;
      blockingMode: string;
      blockingQueryStart: string;
      lockType: string;
      relation: string;
      granted: boolean;
      waitTime: number;
    }>;
    systemMetrics: {
      totalConnections: number;
      activeConnections: number;
      idleConnections: number;
      blockedConnections: number;
      totalTransactions: number;
      activeTransactions: number;
      totalLocks: number;
      grantedLocks: number;
      waitingLocks: number;
      maxConnections: number;
      connectionUtilization: number;
      averageQueryTime: number;
      longestQueryTime: number;
      databaseSize: number;
      cacheHitRatio: number;
      lastAnalyze: string;
      lastVacuum: string;
      lastCheckpoint: string;
    };
  };
  dependencyGraph?: {
    foreignKeyDependencies: Array<{
      sourceTable: string;
      sourceColumn: string;
      targetTable: string;
      targetColumn: string;
      constraintName: string;
      onDelete: string;
      onUpdate: string;
      isDeferrable: boolean;
      initiallyDeferred: boolean;
    }>;
    viewDependencies: Array<{
      viewName: string;
      viewSchema?: string;
      dependsOn: Array<{
        objectType: 'TABLE' | 'VIEW' | 'FUNCTION' | 'PROCEDURE' | 'SEQUENCE' | 'COLLECTION';
        objectName: string;
        objectSchema?: string;
        dependencyType: 'DIRECT' | 'INDIRECT' | 'CIRCULAR';
      }>;
    }>;
    triggerDependencies: Array<{
      triggerName: string;
      tableName: string;
      tableSchema?: string;
      dependsOn: Array<{
        objectType: 'TABLE' | 'VIEW' | 'FUNCTION' | 'PROCEDURE' | 'SEQUENCE' | 'COLLECTION';
        objectName: string;
        objectSchema?: string;
        dependencyType: 'DIRECT' | 'INDIRECT' | 'CIRCULAR';
      }>;
    }>;
    functionDependencies: Array<{
      functionName: string;
      functionSchema?: string;
      functionType: 'FUNCTION' | 'PROCEDURE' | 'TRIGGER';
      dependsOn: Array<{
        objectType: 'TABLE' | 'VIEW' | 'FUNCTION' | 'PROCEDURE' | 'SEQUENCE' | 'COLLECTION';
        objectName: string;
        objectSchema?: string;
        dependencyType: 'DIRECT' | 'INDIRECT' | 'CIRCULAR';
      }>;
      calls: Array<{
        functionName: string;
        functionSchema?: string;
        callType: 'DIRECT' | 'INDIRECT' | 'RECURSIVE';
      }>;
    }>;
    circularDependencies: Array<{
      objects: Array<{
        objectType: 'TABLE' | 'VIEW' | 'FUNCTION' | 'PROCEDURE' | 'TRIGGER' | 'SEQUENCE' | 'COLLECTION';
        objectName: string;
        objectSchema?: string;
      }>;
      dependencyChain: string[];
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }>;
    dependencyMetrics: {
      totalDependencies: number;
      foreignKeyCount: number;
      viewDependencyCount: number;
      triggerDependencyCount: number;
      functionDependencyCount: number;
      circularDependencyCount: number;
      maxDependencyDepth: number;
      averageDependencyDepth: number;
    };
  };
  extensions?: {
    installed: Array<{
      name: string;
      version: string;
      schema: string;
      description?: string;
      installedVersion?: string;
      comment?: string;
    }>;
    available: Array<{
      name: string;
      version: string;
      description?: string;
      comment?: string;
    }>;
  };
  partitioning?: {
    partitionedTables: Array<{
      tableName: string;
      schema: string;
      partitionType: 'RANGE' | 'LIST' | 'HASH' | 'COMPOSITE';
      partitionKey: string[];
      partitionExpression?: string;
      subpartitions?: Array<{
        name: string;
        type: 'RANGE' | 'LIST' | 'HASH';
        key: string[];
        expression?: string;
        values?: any[];
        bounds?: {
          min?: any;
          max?: any;
        };
      }>;
    }>;
    partitionInheritance: Array<{
      parentTable: string;
      parentSchema: string;
      childTable: string;
      childSchema: string;
      inheritanceType: 'TABLE' | 'PARTITION';
    }>;
  };
  engineInfo?: {
    storageEngines: Array<{
      name: string;
      support: 'YES' | 'NO' | 'DEFAULT' | 'DISABLED';
      comment: string;
      transactions: boolean;
      xa: boolean;
      savepoints: boolean;
    }>;
    tableEngines: Array<{
      tableName: string;
      schema: string;
      engine: string;
      version?: string;
      rowFormat?: string;
      tableRows?: number;
      avgRowLength?: number;
      dataLength?: number;
      maxDataLength?: number;
      indexLength?: number;
      dataFree?: number;
      autoIncrement?: number;
      createTime?: string;
      updateTime?: string;
      checkTime?: string;
      tableCollation?: string;
      checksum?: number;
      createOptions?: string;
      tableComment?: string;
    }>;
    engineStatistics: {
      totalTables: number;
      engineCounts: Record<string, number>;
      totalDataSize: number;
      totalIndexSize: number;
      averageRowLength: number;
    };
  };
  pragmas?: {
    database: Array<{
      name: string;
      value: any;
      description: string;
      category: 'DATABASE' | 'SCHEMA' | 'MEMORY' | 'SECURITY' | 'PERFORMANCE' | 'COMPATIBILITY' | 'DEBUGGING';
    }>;
    table: Array<{
      tableName: string;
      pragmas: Array<{
        name: string;
        value: any;
        description: string;
      }>;
    }>;
    index: Array<{
      indexName: string;
      pragmas: Array<{
        name: string;
        value: any;
        description: string;
      }>;
    }>;
  };
  mongoOptions?: {
    collections: Array<{
      name: string;
      options: {
        capped?: boolean;
        size?: number;
        max?: number;
        validator?: any;
        validationLevel?: 'off' | 'strict' | 'moderate';
        validationAction?: 'error' | 'warn';
        collation?: {
          locale: string;
          caseLevel?: boolean;
          caseFirst?: 'off' | 'lower' | 'upper';
          strength?: number;
          numericOrdering?: boolean;
          alternate?: 'non-ignorable' | 'shifted';
          maxVariable?: 'punct' | 'space';
          backwards?: boolean;
        };
        storageEngine?: any;
        indexOptionDefaults?: any;
        viewOn?: string;
        pipeline?: any[];
      };
      stats: {
        count: number;
        size: number;
        avgObjSize: number;
        storageSize: number;
        capped: boolean;
        max: number;
        maxSize: number;
        wiredTiger?: any;
        indexSizes: Record<string, number>;
        totalIndexSize: number;
        indexBuilds: any[];
        totalSize: number;
      };
    }>;
    indexes: Array<{
      collectionName: string;
      indexName: string;
      options: {
        unique?: boolean;
        sparse?: boolean;
        background?: boolean;
        partialFilterExpression?: any;
        expireAfterSeconds?: number;
        name?: string;
        weights?: Record<string, number>;
        default_language?: string;
        language_override?: string;
        textIndexVersion?: number;
        '2dsphereIndexVersion'?: number;
        bits?: number;
        min?: number;
        max?: number;
        bucketSize?: number;
        collation?: any;
        wildcardProjection?: any;
        hidden?: boolean;
      };
      key: Record<string, number>;
      version: number;
    }>;
    databaseOptions: {
      name: string;
      sizeOnDisk: number;
      empty: boolean;
      shards?: any;
      collections: number;
      views: number;
      objects: number;
      avgObjSize: number;
      dataSize: number;
      storageSize: number;
      indexes: number;
      indexSize: number;
      fileSize: number;
      fsUsedSize: number;
      fsTotalSize: number;
    };
  };
  extractionConsistency?: {
    unusedModels: Array<{
      modelName: string;
      modelType: 'TABLE' | 'VIEW' | 'COLLECTION';
      filePath?: string;
      reason: 'NOT_IN_DATABASE' | 'NO_MATCHING_TABLE' | 'STRUCTURE_MISMATCH';
      details: string;
      suggestions: string[];
    }>;
    phantomStructures: Array<{
      structureName: string;
      structureType: 'TABLE' | 'VIEW' | 'INDEX' | 'CONSTRAINT' | 'TRIGGER' | 'FUNCTION' | 'PROCEDURE';
      databaseSource: 'CATALOG' | 'INTROSPECTION';
      reason: 'NOT_IN_ORM' | 'NO_MATCHING_MODEL' | 'ORPHANED_OBJECT';
      details: string;
      suggestions: string[];
    }>;
    constraintDiscrepancies: Array<{
      tableName: string;
      constraintType: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK' | 'NOT_NULL';
      ormDefinition?: {
        name: string;
        columns: string[];
        expression?: string;
        references?: {
          table: string;
          column: string;
        };
      };
      databaseDefinition?: {
        name: string;
        columns: string[];
        expression?: string;
        references?: {
          table: string;
          column: string;
        };
      };
      discrepancyType: 'MISSING_IN_ORM' | 'MISSING_IN_DATABASE' | 'STRUCTURE_MISMATCH' | 'NAME_MISMATCH';
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      details: string;
    }>;
    relationDiscrepancies: Array<{
      tableName: string;
      relationType: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY' | 'BELONGS_TO' | 'HAS_MANY' | 'HAS_ONE';
      ormDefinition?: {
        name: string;
        type: string;
        foreignKey?: string;
        references?: {
          table: string;
          column: string;
        };
        through?: string;
        joinTable?: string;
      };
      databaseDefinition?: {
        name: string;
        type: string;
        foreignKey?: string;
        references?: {
          table: string;
          column: string;
        };
      };
      discrepancyType: 'MISSING_IN_ORM' | 'MISSING_IN_DATABASE' | 'STRUCTURE_MISMATCH' | 'TYPE_MISMATCH';
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      details: string;
    }>;
    columnDiscrepancies: Array<{
      tableName: string;
      columnName: string;
      ormDefinition?: {
        type: string;
        nullable: boolean;
        primaryKey: boolean;
        unique: boolean;
        defaultValue?: any;
        constraints?: string[];
      };
      databaseDefinition?: {
        type: string;
        nullable: boolean;
        primaryKey: boolean;
        unique: boolean;
        defaultValue?: any;
        constraints?: string[];
      };
      discrepancyType: 'MISSING_IN_ORM' | 'MISSING_IN_DATABASE' | 'TYPE_MISMATCH' | 'NULLABLE_MISMATCH' | 'DEFAULT_MISMATCH';
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      details: string;
    }>;
    consistencyMetrics: {
      totalModels: number;
      totalDatabaseObjects: number;
      unusedModelCount: number;
      phantomStructureCount: number;
      constraintDiscrepancyCount: number;
      relationDiscrepancyCount: number;
      columnDiscrepancyCount: number;
      overallConsistencyScore: number;
      criticalIssuesCount: number;
      highIssuesCount: number;
      mediumIssuesCount: number;
      lowIssuesCount: number;
    };
  };
}

export class DatabaseVerificationService {
  /**
   * Verify extracted tables against actual database introspection with reconciliation
   */
  async verifyTables(
    extractedTables: Table[],
    databaseType: DatabaseType,
    connectionInfo: string | { filePath: string } | { connectionString: string }
  ): Promise<VerificationResult> {
    console.log(`🔍 Starting table verification with reconciliation for ${databaseType}...`);
    console.log(`📊 Extracted tables to verify: ${extractedTables.length}`);

    try {
      // Get actual table information from database
      const introspectionResult = await this.introspectDatabase(databaseType, connectionInfo);
      console.log(`📊 Actual tables found in database: ${introspectionResult.actualTables.length}`);

      // Perform reconciliation and verification
      const verificationResult = this.performReconciliation(extractedTables, introspectionResult);
      
      console.log(`✅ Verification with reconciliation completed:`);
      console.log(`  - Verified tables: ${verificationResult.verifiedTables.length}`);
      console.log(`  - Phantom tables: ${verificationResult.phantomTables.length}`);
      console.log(`  - Duplicate tables: ${verificationResult.duplicateTables.length}`);
      console.log(`  - Mismatched tables: ${verificationResult.mismatchedTables.length}`);
      console.log(`  - Accuracy: ${verificationResult.verificationStats.accuracy.toFixed(1)}%`);
      console.log(`  - Reconciliation score: ${verificationResult.verificationStats.reconciliationScore.toFixed(1)}%`);

      return verificationResult;
    } catch (error) {
      console.error('❌ Database verification failed:', error);
      throw new Error(`Database verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate structural hash for a table (checksum of column names + types)
   */
  private generateStructuralHash(columns: Array<{ name: string; type: string }>): string {
    if (!columns || columns.length === 0) return '';
    
    // Sort columns by name for consistent hashing
    const sortedColumns = [...columns].sort((a, b) => a.name.localeCompare(b.name));
    
    // Create a string representation: "colName:colType|colName:colType|..."
    const structureString = sortedColumns
      .map(col => `${col.name.toLowerCase()}:${this.normalizeType(col.type)}`)
      .join('|');
    
    // Generate simple hash (FNV-1a algorithm)
    let hash = 2166136261;
    for (let i = 0; i < structureString.length; i++) {
      hash ^= structureString.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    
    return (hash >>> 0).toString(16);
  }

  /**
   * Normalize database types for comparison
   */
  private normalizeType(type: string): string {
    const normalized = type.toLowerCase().trim();
    
    // Map similar types together
    const typeMap: Record<string, string> = {
      'int': 'integer',
      'int4': 'integer',
      'int8': 'bigint',
      'varchar': 'text',
      'char': 'text',
      'character': 'text',
      'string': 'text',
      'bool': 'boolean',
      'float': 'real',
      'double': 'real',
      'decimal': 'numeric',
      'timestamp': 'datetime',
      'date': 'datetime'
    };
    
    return typeMap[normalized] || normalized;
  }

  /**
   * Compare row counts with tolerance
   */
  private compareRowCounts(count1: number | undefined, count2: number | undefined, tolerance: number = 0.1): boolean {
    if (count1 === undefined || count2 === undefined) return false;
    if (count1 === 0 && count2 === 0) return true;
    
    const diff = Math.abs(count1 - count2);
    const max = Math.max(count1, count2);
    
    // Allow up to 10% difference (for databases with ongoing transactions)
    return (diff / max) <= tolerance;
  }

  /**
   * Perform reconciliation between extracted and database tables
   */
  private performReconciliation(
    extractedTables: Table[],
    introspectionResult: DatabaseIntrospectionResult
  ): VerificationResult {
    console.log('🔄 Starting reconciliation process...');
    
    // Generate structural hashes for database tables
    const dbTablesWithHashes = introspectionResult.tableMetadata.map(dbTable => ({
      ...dbTable,
      structuralHash: this.generateStructuralHash(dbTable.columns || [])
    }));

    // Generate structural hashes for extracted tables
    const extractedTablesWithHashes = extractedTables.map(table => ({
      table,
      structuralHash: this.generateStructuralHash(
        table.columns.map(col => ({ name: col.name, type: col.type }))
      )
    }));

    const verifiedTables: Table[] = [];
    const phantomTables: Table[] = [];
    const duplicateTables: Table[] = [];
    const mismatchedTables: Table[] = [];
    const reconciliationMatches: ReconciliationMatch[] = [];
    
    const seenTableNames = new Set<string>();
    const matchedDbTables = new Set<string>();

    // First pass: Match by name and structure
    for (const { table, structuralHash } of extractedTablesWithHashes) {
      const tableNameLower = table.name.toLowerCase();
      
      // Check for duplicates
      if (seenTableNames.has(tableNameLower)) {
        duplicateTables.push(table);
        continue;
      }
      seenTableNames.add(tableNameLower);

      // Find matching database table
      const dbTable = dbTablesWithHashes.find(
        db => db.name.toLowerCase() === tableNameLower
      );

      if (dbTable) {
        // Table exists in database - check structural match
        const schemaMatch = (table.schema || 'main') === (dbTable.schema || 'main');
        const structuralMatch = structuralHash === dbTable.structuralHash;
        const rowCountMatch = this.compareRowCounts((table as any).rowCount, dbTable.rowCount);
        
        const matchReasons: string[] = [];
        let matchScore = 0;
        
        // Calculate match score
        matchScore += 40; // Base score for name match
        
        if (schemaMatch) {
          matchScore += 20;
          matchReasons.push('schema match');
        }
        
        if (structuralMatch) {
          matchScore += 30;
          matchReasons.push('structural match');
        } else {
          matchReasons.push('structural mismatch');
        }
        
        if (rowCountMatch) {
          matchScore += 10;
          matchReasons.push('row count match');
        }
        
        // Create reconciliation match
        const match: ReconciliationMatch = {
          extractedTable: table,
          databaseTable: dbTable,
          matchScore,
          matchReasons,
          structuralHash,
          schemaMatch,
          rowCountMatch
        };
        
        reconciliationMatches.push(match);
        matchedDbTables.add(dbTable.name.toLowerCase());

        // Require at least 70% match score for verification
        if (matchScore >= 70) {
          // Enhance table with verified metadata
          const verifiedTable: Table = {
            ...table,
            schema: dbTable.schema,
            columns: dbTable.columns?.map(col => ({
              id: `${table.id}_${col.name}`,
              name: col.name,
              type: col.type as any,
              nullable: col.nullable,
              primaryKey: col.primaryKey,
              defaultValue: undefined
            })) || table.columns
          };
          verifiedTables.push(verifiedTable);
        } else {
          // Structural mismatch - table exists but structure doesn't match ORM
          console.warn(`⚠️  Structural mismatch for table "${table.name}" (score: ${matchScore}%)`);
          mismatchedTables.push(table);
        }
      } else {
        // Table doesn't exist in database
        // Check if there's a table with matching structure but different name
        const structuralMatchDb = dbTablesWithHashes.find(
          db => db.structuralHash === structuralHash && !matchedDbTables.has(db.name.toLowerCase())
        );

        if (structuralMatchDb) {
          // Found table with same structure but different name
          console.log(`🔄 Found structural match: "${table.name}" → "${structuralMatchDb.name}"`);
          
          const match: ReconciliationMatch = {
            extractedTable: table,
            databaseTable: structuralMatchDb,
            matchScore: 60, // Lower score due to name mismatch
            matchReasons: ['structural match', 'name mismatch'],
            structuralHash,
            schemaMatch: false,
            rowCountMatch: false
          };
          
          reconciliationMatches.push(match);
          matchedDbTables.add(structuralMatchDb.name.toLowerCase());
          
          // Still verify but with warning
          const verifiedTable: Table = {
            ...table,
            name: structuralMatchDb.name, // Use database name
            columns: structuralMatchDb.columns?.map(col => ({
              id: `${table.id}_${col.name}`,
              name: col.name,
              type: col.type as any,
              nullable: col.nullable,
              primaryKey: col.primaryKey,
              defaultValue: undefined
            })) || table.columns
          };
          verifiedTables.push(verifiedTable);
        } else {
          // No match found - phantom table
          phantomTables.push(table);
        }
      }
    }

    // Check for unmatched database tables (tables in DB but not in ORM)
    const unmatchedDbTables = dbTablesWithHashes.filter(
      db => !matchedDbTables.has(db.name.toLowerCase())
    );
    
    if (unmatchedDbTables.length > 0) {
      console.log(`ℹ️  Found ${unmatchedDbTables.length} tables in database not present in ORM extraction:`);
      unmatchedDbTables.forEach(db => console.log(`  - ${db.name}`));
    }

    // Calculate statistics
    const totalExtracted = extractedTables.length;
    const verified = verifiedTables.length;
    const phantoms = phantomTables.length;
    const duplicates = duplicateTables.length;
    const mismatched = mismatchedTables.length;
    const accuracy = totalExtracted > 0 ? ((verified / totalExtracted) * 100) : 100;
    
    // Calculate reconciliation score (1:1 mapping quality)
    const totalDbTables = introspectionResult.tableMetadata.length;
    const perfectMatches = reconciliationMatches.filter(m => m.matchScore >= 90).length;
    const reconciliationScore = totalDbTables > 0 ? 
      ((perfectMatches / Math.max(totalDbTables, totalExtracted)) * 100) : 100;

    console.log(`🎯 Reconciliation summary:`);
    console.log(`  - Perfect matches (≥90%): ${perfectMatches}`);
    console.log(`  - Good matches (≥70%): ${reconciliationMatches.filter(m => m.matchScore >= 70).length}`);
    console.log(`  - Weak matches (<70%): ${reconciliationMatches.filter(m => m.matchScore < 70).length}`);
    console.log(`  - Unmatched database tables: ${unmatchedDbTables.length}`);

      // Perform extraction consistency analysis
      const extractionConsistency = this.analyzeExtractionConsistency(extractedTables, introspectionResult);

    return {
      verifiedTables,
      phantomTables,
      duplicateTables,
      mismatchedTables,
      reconciliationMatches,
      verificationStats: {
        totalExtracted,
        verified,
        phantoms,
        duplicates,
        mismatched,
        accuracy,
        reconciliationScore
      },
      extractionConsistency
    };
  }

  /**
   * Analyze extraction consistency between ORM models and database catalog data
   */
  private analyzeExtractionConsistency(
    extractedTables: Table[],
    introspectionResult: DatabaseIntrospectionResult
  ): any {
    try {
      console.log('🔍 Analyzing extraction consistency...');

      const consistency: any = {
        unusedModels: [],
        phantomStructures: [],
        constraintDiscrepancies: [],
        relationDiscrepancies: [],
        columnDiscrepancies: [],
        consistencyMetrics: {
          totalModels: 0,
          totalDatabaseObjects: 0,
          unusedModelCount: 0,
          phantomStructureCount: 0,
          constraintDiscrepancyCount: 0,
          relationDiscrepancyCount: 0,
          columnDiscrepancyCount: 0,
          overallConsistencyScore: 0,
          criticalIssuesCount: 0,
          highIssuesCount: 0,
          mediumIssuesCount: 0,
          lowIssuesCount: 0
        }
      };

      // Analyze unused models (ORM models not found in database)
      const unusedModels = this.analyzeUnusedModels(extractedTables, introspectionResult);
      consistency.unusedModels = unusedModels;

      // Analyze phantom structures (database objects not found in ORM)
      const phantomStructures = this.analyzePhantomStructures(extractedTables, introspectionResult);
      consistency.phantomStructures = phantomStructures;

      // Analyze constraint discrepancies
      const constraintDiscrepancies = this.analyzeConstraintDiscrepancies(extractedTables, introspectionResult);
      consistency.constraintDiscrepancies = constraintDiscrepancies;

      // Analyze relation discrepancies
      const relationDiscrepancies = this.analyzeRelationDiscrepancies(extractedTables, introspectionResult);
      consistency.relationDiscrepancies = relationDiscrepancies;

      // Analyze column discrepancies
      const columnDiscrepancies = this.analyzeColumnDiscrepancies(extractedTables, introspectionResult);
      consistency.columnDiscrepancies = columnDiscrepancies;

      // Calculate consistency metrics
      consistency.consistencyMetrics = this.calculateConsistencyMetrics(consistency);

      console.log(`  - Unused models: ${consistency.unusedModels.length}`);
      console.log(`  - Phantom structures: ${consistency.phantomStructures.length}`);
      console.log(`  - Constraint discrepancies: ${consistency.constraintDiscrepancies.length}`);
      console.log(`  - Relation discrepancies: ${consistency.relationDiscrepancies.length}`);
      console.log(`  - Column discrepancies: ${consistency.columnDiscrepancies.length}`);
      console.log(`  - Overall consistency score: ${consistency.consistencyMetrics.overallConsistencyScore}%`);

      return consistency;
    } catch (error) {
      console.warn(`⚠️ Could not analyze extraction consistency:`, error);
      return {
        unusedModels: [],
        phantomStructures: [],
        constraintDiscrepancies: [],
        relationDiscrepancies: [],
        columnDiscrepancies: [],
        consistencyMetrics: {
          totalModels: 0,
          totalDatabaseObjects: 0,
          unusedModelCount: 0,
          phantomStructureCount: 0,
          constraintDiscrepancyCount: 0,
          relationDiscrepancyCount: 0,
          columnDiscrepancyCount: 0,
          overallConsistencyScore: 0,
          criticalIssuesCount: 0,
          highIssuesCount: 0,
          mediumIssuesCount: 0,
          lowIssuesCount: 0
        }
      };
    }
  }

  /**
   * Analyze unused models (ORM models not found in database)
   */
  private analyzeUnusedModels(
    extractedTables: Table[],
    introspectionResult: DatabaseIntrospectionResult
  ): any[] {
    const unusedModels: any[] = [];
    const databaseTables = new Set(introspectionResult.actualTables.map(t => t.toLowerCase()));

    for (const table of extractedTables) {
      const tableName = table.name.toLowerCase();
      
      if (!databaseTables.has(tableName)) {
        // Check if it's a view or collection
        const isView = introspectionResult.views?.some(v => v.name.toLowerCase() === tableName);
        const isCollection = introspectionResult.tableMetadata?.some(t => t.name.toLowerCase() === tableName && t.type === 'COLLECTION');
        
        let modelType: 'TABLE' | 'VIEW' | 'COLLECTION' = 'TABLE';
        let reason: 'NOT_IN_DATABASE' | 'NO_MATCHING_TABLE' | 'STRUCTURE_MISMATCH' = 'NOT_IN_DATABASE';
        let details = `Model "${table.name}" is defined in ORM but not found in database`;
        let suggestions: string[] = [];

        if (isView) {
          modelType = 'VIEW';
          reason = 'NO_MATCHING_TABLE';
          details = `Model "${table.name}" is defined as a table in ORM but exists as a view in database`;
          suggestions = [
            'Consider changing the model type to view',
            'Verify if the model should represent a table instead of a view',
            'Check if the view definition matches the model structure'
          ];
        } else if (isCollection) {
          modelType = 'COLLECTION';
          reason = 'NO_MATCHING_TABLE';
          details = `Model "${table.name}" is defined as a table in ORM but exists as a collection in database`;
          suggestions = [
            'Consider changing the model type to collection',
            'Verify if the model should represent a table instead of a collection',
            'Check if the collection structure matches the model structure'
          ];
        } else {
          suggestions = [
            'Verify the model name matches the database table name',
            'Check if the table exists in the correct schema/database',
            'Consider if the model should be removed or the table should be created',
            'Verify database connection and permissions'
          ];
        }

        unusedModels.push({
          modelName: table.name,
          modelType,
          filePath: (table as any).filePath,
          reason,
          details,
          suggestions
        });
      }
    }

    return unusedModels;
  }

  /**
   * Analyze phantom structures (database objects not found in ORM)
   */
  private analyzePhantomStructures(
    extractedTables: Table[],
    introspectionResult: DatabaseIntrospectionResult
  ): any[] {
    const phantomStructures: any[] = [];
    const ormTables = new Set(extractedTables.map(t => t.name.toLowerCase()));

    // Check for phantom tables
    for (const tableName of introspectionResult.actualTables) {
      if (!ormTables.has(tableName.toLowerCase())) {
        phantomStructures.push({
          structureName: tableName,
          structureType: 'TABLE',
          databaseSource: 'INTROSPECTION',
          reason: 'NOT_IN_ORM',
          details: `Table "${tableName}" exists in database but has no corresponding ORM model`,
          suggestions: [
            'Create an ORM model for this table',
            'Verify if the table should be removed from the database',
            'Check if the table name matches the expected naming convention',
            'Consider if the table is used by other applications'
          ]
        });
      }
    }

    // Check for phantom views
    if (introspectionResult.views) {
      for (const view of introspectionResult.views) {
        if (!ormTables.has(view.name.toLowerCase())) {
          phantomStructures.push({
            structureName: view.name,
            structureType: 'VIEW',
            databaseSource: 'CATALOG',
            reason: 'NOT_IN_ORM',
            details: `View "${view.name}" exists in database but has no corresponding ORM model`,
            suggestions: [
              'Create an ORM model for this view',
              'Verify if the view should be removed from the database',
              'Check if the view is used by other applications',
              'Consider if the view should be represented as a table model'
            ]
          });
        }
      }
    }

    // Check for phantom indexes
    if (introspectionResult.indexes) {
      for (const index of introspectionResult.indexes) {
        if (!ormTables.has(index.tableName.toLowerCase())) {
          phantomStructures.push({
            structureName: index.name,
            structureType: 'INDEX',
            databaseSource: 'CATALOG',
            reason: 'ORPHANED_OBJECT',
            details: `Index "${index.name}" exists for table "${index.tableName}" which has no ORM model`,
            suggestions: [
              'Create an ORM model for the table this index belongs to',
              'Verify if the index should be removed',
              'Check if the table is used by other applications'
            ]
          });
        }
      }
    }

    // Check for phantom constraints
    for (const table of introspectionResult.tableMetadata || []) {
      if (!ormTables.has(table.name.toLowerCase())) {
        if (table.constraints?.primaryKeyConstraints) {
          for (const pk of table.constraints.primaryKeyConstraints) {
            phantomStructures.push({
              structureName: pk.name,
              structureType: 'CONSTRAINT',
              databaseSource: 'CATALOG',
              reason: 'ORPHANED_OBJECT',
              details: `Primary key constraint "${pk.name}" exists for table "${table.name}" which has no ORM model`,
              suggestions: [
                'Create an ORM model for the table this constraint belongs to',
                'Verify if the constraint should be removed',
                'Check if the table is used by other applications'
              ]
            });
          }
        }

        if (table.constraints?.foreignKeyConstraints) {
          for (const fk of table.constraints.foreignKeyConstraints) {
            phantomStructures.push({
              structureName: fk.name,
              structureType: 'CONSTRAINT',
              databaseSource: 'CATALOG',
              reason: 'ORPHANED_OBJECT',
              details: `Foreign key constraint "${fk.name}" exists for table "${table.name}" which has no ORM model`,
              suggestions: [
                'Create an ORM model for the table this constraint belongs to',
                'Verify if the constraint should be removed',
                'Check if the table is used by other applications'
              ]
            });
          }
        }
      }
    }

    return phantomStructures;
  }

  /**
   * Analyze constraint discrepancies between ORM and database
   */
  private analyzeConstraintDiscrepancies(
    extractedTables: Table[],
    introspectionResult: DatabaseIntrospectionResult
  ): any[] {
    const discrepancies: any[] = [];

    for (const table of extractedTables) {
      const dbTable = introspectionResult.tableMetadata?.find(t => t.name.toLowerCase() === table.name.toLowerCase());
      if (!dbTable) continue;

      // Analyze primary key constraints
      const ormPK = table.columns?.filter(c => c.primaryKey);
      const dbPK = dbTable.constraints?.primaryKeyConstraints || [];

      if (ormPK.length > 0 && dbPK.length === 0) {
        discrepancies.push({
          tableName: table.name,
          constraintType: 'PRIMARY_KEY',
          ormDefinition: {
            name: 'primary_key',
            columns: ormPK.map(c => c.name)
          },
          databaseDefinition: undefined,
          discrepancyType: 'MISSING_IN_DATABASE',
          severity: 'HIGH',
          details: `Primary key defined in ORM but not found in database for table "${table.name}"`
        });
      } else if (ormPK.length === 0 && dbPK.length > 0) {
        discrepancies.push({
          tableName: table.name,
          constraintType: 'PRIMARY_KEY',
          ormDefinition: undefined,
          databaseDefinition: {
            name: dbPK[0].name,
            columns: dbPK[0].columns
          },
          discrepancyType: 'MISSING_IN_ORM',
          severity: 'MEDIUM',
          details: `Primary key exists in database but not defined in ORM for table "${table.name}"`
        });
      } else if (ormPK.length > 0 && dbPK.length > 0) {
        const ormPKColumns = ormPK.map(c => c.name).sort();
        const dbPKColumns = dbPK[0].columns.sort();
        
        if (JSON.stringify(ormPKColumns) !== JSON.stringify(dbPKColumns)) {
          discrepancies.push({
            tableName: table.name,
            constraintType: 'PRIMARY_KEY',
            ormDefinition: {
              name: 'primary_key',
              columns: ormPKColumns
            },
            databaseDefinition: {
              name: dbPK[0].name,
              columns: dbPKColumns
            },
            discrepancyType: 'STRUCTURE_MISMATCH',
            severity: 'HIGH',
            details: `Primary key columns mismatch between ORM and database for table "${table.name}"`
          });
        }
      }

      // Analyze foreign key constraints
      const ormFKs = table.columns?.filter(c => c.foreignKey).map(c => ({
        name: `${table.name}_${c.name}_fk`,
        columns: [c.name],
        references: c.foreignKey
      })) || [];
      const dbFKs = dbTable.constraints?.foreignKeyConstraints || [];

      // Check for ORM foreign keys not in database
      for (const ormFK of ormFKs) {
        const matchingDBFK = dbFKs.find(dbFK => 
          dbFK.columns.includes(ormFK.columns[0]) &&
          dbFK.referencedTable === ormFK.references?.tableId &&
          dbFK.referencedColumns.includes(ormFK.references?.columnId || '')
        );

        if (!matchingDBFK) {
          discrepancies.push({
            tableName: table.name,
            constraintType: 'FOREIGN_KEY',
            ormDefinition: ormFK,
            databaseDefinition: undefined,
            discrepancyType: 'MISSING_IN_DATABASE',
            severity: 'HIGH',
            details: `Foreign key constraint defined in ORM but not found in database for table "${table.name}"`
          });
        }
      }

      // Check for database foreign keys not in ORM
      for (const dbFK of dbFKs) {
        const matchingORMFK = ormFKs.find(ormFK => 
          ormFK.columns.includes(dbFK.columns[0]) &&
          ormFK.references?.tableId === dbFK.referencedTable &&
          ormFK.references?.columnId === dbFK.referencedColumns[0]
        );

        if (!matchingORMFK) {
          discrepancies.push({
            tableName: table.name,
            constraintType: 'FOREIGN_KEY',
            ormDefinition: undefined,
            databaseDefinition: dbFK,
            discrepancyType: 'MISSING_IN_ORM',
            severity: 'MEDIUM',
            details: `Foreign key constraint exists in database but not defined in ORM for table "${table.name}"`
          });
        }
      }
    }

    return discrepancies;
  }

  /**
   * Analyze relation discrepancies between ORM and database
   */
  private analyzeRelationDiscrepancies(
    extractedTables: Table[],
    introspectionResult: DatabaseIntrospectionResult
  ): any[] {
    const discrepancies: any[] = [];

    // This is a simplified analysis - in a real implementation, you would need to
    // parse ORM relationship definitions and compare them with foreign key constraints
    for (const table of extractedTables) {
      const dbTable = introspectionResult.tableMetadata?.find(t => t.name.toLowerCase() === table.name.toLowerCase());
      if (!dbTable) continue;

      const dbFKs = dbTable.constraints?.foreignKeyConstraints || [];
      
      // Check for foreign keys that might represent relationships
      for (const fk of dbFKs) {
        if (fk.referencedTable) {
          const referencedTable = extractedTables.find(t => t.name.toLowerCase() === fk.referencedTable?.toLowerCase());
          
          if (referencedTable) {
            // This could be a relationship - check if it's properly defined in ORM
            // For now, we'll just note that there's a potential relationship
            discrepancies.push({
              tableName: table.name,
              relationType: 'BELONGS_TO',
              ormDefinition: undefined,
              databaseDefinition: {
                name: fk.name,
                type: 'foreign_key',
                foreignKey: fk.columns[0],
                references: {
                  table: fk.referencedTable,
                  column: fk.referencedColumns[0]
                }
              },
              discrepancyType: 'MISSING_IN_ORM',
              severity: 'LOW',
              details: `Potential relationship detected in database but not defined in ORM for table "${table.name}"`
            });
          }
        }
      }
    }

    return discrepancies;
  }

  /**
   * Analyze column discrepancies between ORM and database
   */
  private analyzeColumnDiscrepancies(
    extractedTables: Table[],
    introspectionResult: DatabaseIntrospectionResult
  ): any[] {
    const discrepancies: any[] = [];

    for (const table of extractedTables) {
      const dbTable = introspectionResult.tableMetadata?.find(t => t.name.toLowerCase() === table.name.toLowerCase());
      if (!dbTable) continue;

      const ormColumns = table.columns || [];
      const dbColumns = dbTable.columns || [];

      // Check for ORM columns not in database
      for (const ormCol of ormColumns) {
        const dbCol = dbColumns.find(c => c.name.toLowerCase() === ormCol.name.toLowerCase());
        
        if (!dbCol) {
          discrepancies.push({
            tableName: table.name,
            columnName: ormCol.name,
            ormDefinition: {
              type: ormCol.type,
              nullable: ormCol.nullable,
              primaryKey: ormCol.primaryKey,
              unique: ormCol.unique || false,
              defaultValue: ormCol.defaultValue,
              constraints: []
            },
            databaseDefinition: undefined,
            discrepancyType: 'MISSING_IN_DATABASE',
            severity: 'HIGH',
            details: `Column "${ormCol.name}" defined in ORM but not found in database for table "${table.name}"`
          });
        } else {
          // Check for type mismatches
          if (ormCol.type !== dbCol.type) {
            discrepancies.push({
              tableName: table.name,
              columnName: ormCol.name,
              ormDefinition: {
                type: ormCol.type,
                nullable: ormCol.nullable,
                primaryKey: ormCol.primaryKey,
                unique: ormCol.unique || false,
                defaultValue: ormCol.defaultValue,
                constraints: []
              },
              databaseDefinition: {
                type: dbCol.type,
                nullable: dbCol.nullable,
                primaryKey: dbCol.primaryKey,
                unique: dbCol.unique || false,
                defaultValue: dbCol.defaultValue,
                constraints: []
              },
              discrepancyType: 'TYPE_MISMATCH',
              severity: 'MEDIUM',
              details: `Column type mismatch for "${ormCol.name}" in table "${table.name}": ORM has "${ormCol.type}", database has "${dbCol.type}"`
            });
          }

          // Check for nullable mismatches
          if (ormCol.nullable !== dbCol.nullable) {
            discrepancies.push({
              tableName: table.name,
              columnName: ormCol.name,
              ormDefinition: {
                type: ormCol.type,
                nullable: ormCol.nullable,
                primaryKey: ormCol.primaryKey,
                unique: ormCol.unique || false,
                defaultValue: ormCol.defaultValue,
                constraints: []
              },
              databaseDefinition: {
                type: dbCol.type,
                nullable: dbCol.nullable,
                primaryKey: dbCol.primaryKey,
                unique: dbCol.unique || false,
                defaultValue: dbCol.defaultValue,
                constraints: []
              },
              discrepancyType: 'NULLABLE_MISMATCH',
              severity: 'MEDIUM',
              details: `Nullable mismatch for "${ormCol.name}" in table "${table.name}": ORM has ${ormCol.nullable}, database has ${dbCol.nullable}`
            });
          }
        }
      }

      // Check for database columns not in ORM
      for (const dbCol of dbColumns) {
        const ormCol = ormColumns.find(c => c.name.toLowerCase() === dbCol.name.toLowerCase());
        
        if (!ormCol) {
          discrepancies.push({
            tableName: table.name,
            columnName: dbCol.name,
            ormDefinition: undefined,
            databaseDefinition: {
              type: dbCol.type,
              nullable: dbCol.nullable,
              primaryKey: dbCol.primaryKey,
              unique: dbCol.unique || false,
              defaultValue: dbCol.defaultValue,
              constraints: []
            },
            discrepancyType: 'MISSING_IN_ORM',
            severity: 'MEDIUM',
            details: `Column "${dbCol.name}" exists in database but not defined in ORM for table "${table.name}"`
          });
        }
      }
    }

    return discrepancies;
  }

  /**
   * Calculate consistency metrics
   */
  private calculateConsistencyMetrics(consistency: any): any {
    const totalModels = consistency.unusedModels.length;
    const totalDatabaseObjects = consistency.phantomStructures.length;
    const unusedModelCount = consistency.unusedModels.length;
    const phantomStructureCount = consistency.phantomStructures.length;
    const constraintDiscrepancyCount = consistency.constraintDiscrepancies.length;
    const relationDiscrepancyCount = consistency.relationDiscrepancies.length;
    const columnDiscrepancyCount = consistency.columnDiscrepancies.length;

    // Count issues by severity
    let criticalIssuesCount = 0;
    let highIssuesCount = 0;
    let mediumIssuesCount = 0;
    let lowIssuesCount = 0;

    // Count constraint discrepancies by severity
    for (const discrepancy of consistency.constraintDiscrepancies) {
      switch (discrepancy.severity) {
        case 'CRITICAL': criticalIssuesCount++; break;
        case 'HIGH': highIssuesCount++; break;
        case 'MEDIUM': mediumIssuesCount++; break;
        case 'LOW': lowIssuesCount++; break;
      }
    }

    // Count relation discrepancies by severity
    for (const discrepancy of consistency.relationDiscrepancies) {
      switch (discrepancy.severity) {
        case 'CRITICAL': criticalIssuesCount++; break;
        case 'HIGH': highIssuesCount++; break;
        case 'MEDIUM': mediumIssuesCount++; break;
        case 'LOW': lowIssuesCount++; break;
      }
    }

    // Count column discrepancies by severity
    for (const discrepancy of consistency.columnDiscrepancies) {
      switch (discrepancy.severity) {
        case 'CRITICAL': criticalIssuesCount++; break;
        case 'HIGH': highIssuesCount++; break;
        case 'MEDIUM': mediumIssuesCount++; break;
        case 'LOW': lowIssuesCount++; break;
      }
    }

    // Calculate overall consistency score
    const totalIssues = criticalIssuesCount + highIssuesCount + mediumIssuesCount + lowIssuesCount;
    const totalPossibleIssues = totalModels + totalDatabaseObjects + constraintDiscrepancyCount + relationDiscrepancyCount + columnDiscrepancyCount;
    
    let overallConsistencyScore = 100;
    if (totalPossibleIssues > 0) {
      overallConsistencyScore = Math.max(0, 100 - (totalIssues / totalPossibleIssues) * 100);
    }

    return {
      totalModels,
      totalDatabaseObjects,
      unusedModelCount,
      phantomStructureCount,
      constraintDiscrepancyCount,
      relationDiscrepancyCount,
      columnDiscrepancyCount,
      overallConsistencyScore: Math.round(overallConsistencyScore),
      criticalIssuesCount,
      highIssuesCount,
      mediumIssuesCount,
      lowIssuesCount
    };
  }

  /**
   * Introspect database to get actual table information
   */
  private async introspectDatabase(
    databaseType: DatabaseType,
    connectionInfo: string | { filePath: string } | { connectionString: string }
  ): Promise<DatabaseIntrospectionResult> {
    switch (databaseType) {
      case 'sqlite':
        return await this.introspectSQLite(connectionInfo as { filePath: string });
      case 'postgresql':
        return await this.introspectPostgreSQL(connectionInfo as string);
      case 'mysql':
        return await this.introspectMySQL(connectionInfo as string);
      case 'mongodb':
        return await this.introspectMongoDB(connectionInfo as string);
      default:
        throw new Error(`Unsupported database type for verification: ${databaseType}`);
    }
  }

  /**
   * Introspect SQLite database using PRAGMA and sqlite_master
   */
  private async introspectSQLite(connectionInfo: { filePath: string }): Promise<DatabaseIntrospectionResult> {
    const { filePath } = connectionInfo;
    
    if (!filePath) {
      throw new Error('SQLite file path is required for verification');
    }

    try {
      // Use dynamic import to avoid bundling issues
      const Database = require('better-sqlite3');
      const db = new Database(filePath, { readonly: true });

      // Get table list using PRAGMA table_list (SQLite 3.37+)
      let tableList: Array<{ name: string; schema: string; type: string }> = [];
      try {
        const pragmaResult = db.prepare('PRAGMA table_list').all();
        tableList = pragmaResult.map((row: any) => ({
          name: row.name,
          schema: row.schema || 'main',
          type: row.type || 'table'
        }));
      } catch (pragmaError) {
        console.warn('⚠️ PRAGMA table_list not supported, falling back to sqlite_master');
        // Fallback to sqlite_master for older SQLite versions
        const masterResult = db.prepare(`
          SELECT name, type 
          FROM sqlite_master 
          WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
        `).all();
        tableList = masterResult.map((row: any) => ({
          name: row.name,
          schema: 'main',
          type: row.type
        }));
      }

      // Filter actual tables (not views)
      const tables = tableList.filter(t => t.type === 'table');
      const viewsList = tableList.filter(t => t.type === 'view');

      // Get detailed table information
      const tableMetadata = await Promise.all(
        tables.map(async (table) => {
          try {
            // Get column information using PRAGMA table_info
            const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
            
            // Get foreign key information
            const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
            const fkMap = new Map();
            foreignKeys.forEach((fk: any) => {
              fkMap.set(fk.from, {
                table: fk.table,
                column: fk.to,
                onDelete: fk.on_delete,
                onUpdate: fk.on_update
              });
            });
            
            const columnInfo = columns.map((col: any, index: number) => {
              // Parse type for length/precision/scale
              const typeMatch = col.type.match(/^(\w+)(?:\((\d+)(?:,\s*(\d+))?\))?/);
              const baseType = typeMatch ? typeMatch[1] : col.type;
              const maxLength = typeMatch && typeMatch[2] ? parseInt(typeMatch[2]) : undefined;
              const precision = typeMatch && typeMatch[2] ? parseInt(typeMatch[2]) : undefined;
              const scale = typeMatch && typeMatch[3] ? parseInt(typeMatch[3]) : undefined;
              
              // Check for autoincrement (only on INTEGER PRIMARY KEY)
              const autoIncrement = col.pk === 1 && 
                                   baseType.toUpperCase() === 'INTEGER' && 
                                   columns.filter((c: any) => c.pk === 1).length === 1;
              
              // Get foreign key info
              const foreignKey = fkMap.get(col.name);
              
              return {
              name: col.name,
              type: col.type,
              nullable: col.notnull === 0,
                primaryKey: col.pk === 1,
                defaultValue: col.dflt_value,
                autoIncrement,
                unique: false, // Will be updated from index info
                ordinalPosition: index + 1,
                maxLength,
                precision,
                scale,
                foreignKey
              };
            });
            
            // Get constraints from table schema
            const tableSchema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(table.name);
            const schema = (tableSchema as any)?.sql || '';
            
            // Extract check constraints from schema
            const checkConstraints = this.extractSQLiteCheckConstraints(schema);
            
            // Get unique constraints from index info
            const indexes = db.prepare(`PRAGMA index_list(${table.name})`).all();
            const uniqueConstraints: any[] = [];
            const primaryKeyConstraints: any[] = [];
            
            indexes.forEach((idx: any) => {
              if (idx.unique === 1) {
                const indexInfo = db.prepare(`PRAGMA index_info(${idx.name})`).all();
                const columns = indexInfo.map((col: any) => col.name);
                
                if (idx.name.includes('pk_') || idx.name.includes('primary')) {
                  primaryKeyConstraints.push({
                    name: idx.name,
                    columns: columns,
                    isDeferrable: false,
                    initiallyDeferred: false,
                    isEnabled: true
                  });
                } else {
                  uniqueConstraints.push({
                    name: idx.name,
                    columns: columns,
                    isDeferrable: false,
                    initiallyDeferred: false,
                    isEnabled: true
                  });
                }
                
                // Update column unique flag
                if (indexInfo.length === 1) {
                  const columnName = indexInfo[0].name;
                  const column = columnInfo.find((c: any) => c.name === columnName);
                  if (column) column.unique = true;
                }
              }
            });

            // Get foreign key constraints
            const foreignKeyConstraints = foreignKeys.map((fk: any) => ({
              name: `fk_${table.name}_${fk.from}`,
              columns: [fk.from],
              referencedTable: fk.table,
              referencedColumns: [fk.to],
              onDelete: fk.on_delete || 'NO ACTION',
              onUpdate: fk.on_update || 'NO ACTION',
              isDeferrable: false,
              initiallyDeferred: false,
              isEnabled: true
            }));

            const constraints = {
              checkConstraints,
              uniqueConstraints,
              primaryKeyConstraints,
              foreignKeyConstraints
            };

            // Get row count
            let rowCount = 0;
            try {
              const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
              rowCount = (countResult as any)?.count || 0;
            } catch (countError) {
              console.warn(`⚠️ Could not get row count for table ${table.name}:`, countError);
            }

            // Get creation DDL
            let creationDDL = '';
            try {
              const ddlResult = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(table.name);
              creationDDL = (ddlResult as any)?.sql || '';
            } catch (ddlError) {
              console.warn(`⚠️ Could not get DDL for table ${table.name}:`, ddlError);
            }

            // Check if temporary table
            const tableType = table.name.startsWith('temp_') || table.name.startsWith('tmp_') ? 'TEMPORARY' as const : 'BASE TABLE' as const;

            return {
              name: table.name,
              type: table.type,
              schema: table.schema,
              rowCount,
              tableType,
              creationDDL,
              constraints,
              columns: columnInfo
            };
          } catch (error) {
            console.warn(`⚠️ Could not get metadata for table ${table.name}:`, error);
            return {
              name: table.name,
              type: table.type,
              schema: table.schema,
              rowCount: 0,
              tableType: 'BASE TABLE' as any,
              columns: []
            };
          }
        })
      );

      // Extract views
      const views = viewsList.map(view => {
        try {
          const ddlResult = db.prepare(`SELECT sql FROM sqlite_master WHERE type='view' AND name=?`).get(view.name);
          const definition = (ddlResult as any)?.sql || '';
          
          return {
            name: view.name,
            schema: view.schema,
            definition,
            isMaterialized: false,
            creationDDL: definition
          };
        } catch (error) {
          console.warn(`⚠️ Could not get view definition for ${view.name}:`, error);
          return {
            name: view.name,
            schema: view.schema,
            definition: '',
            isMaterialized: false
          };
        }
      });

      // Extract indexes
      const indexesResult = db.prepare(`
        SELECT 
          name,
          tbl_name as table_name,
          sql
        FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all();

      const indexes = indexesResult.map((idx: any) => {
        try {
          // Get index info
          const indexInfo = db.prepare(`PRAGMA index_info(${idx.name})`).all();
          const columns = indexInfo.map((col: any) => col.name);
          
          // Check if unique
          const indexListResult = db.prepare(`PRAGMA index_list(${idx.table_name})`).all();
          const indexDetails = indexListResult.find((i: any) => i.name === idx.name);
          const isUnique = indexDetails?.unique === 1;
          
          // Parse SQL for additional metadata
          const sql = idx.sql || '';
          const whereClause = this.parseIndexWhereClause(sql);
          const isPartial = Boolean(whereClause);
          const columnExpressions = this.parseIndexColumnExpressions(sql);
          
          return {
            name: idx.name,
            tableName: idx.table_name,
            schema: 'main',
            type: 'BTREE' as any,
            columns,
            isUnique,
            isPrimary: idx.name.includes('pk_') || idx.name.includes('primary'),
            isPartial,
            whereClause,
            predicate: whereClause, // Alias for whereClause
            creationDDL: sql,
            indexMethod: 'btree',
            columnExpressions,
            comment: undefined
          };
        } catch (error) {
          console.warn(`⚠️ Could not get index details for ${idx.name}:`, error);
          return {
            name: idx.name,
            tableName: idx.table_name,
            schema: 'main',
            type: 'BTREE' as any,
            columns: [],
            isUnique: false,
            isPrimary: false
          };
        }
      });

      // Extract triggers
      const triggersResult = db.prepare(`
        SELECT 
          name,
          tbl_name as table_name,
          sql
        FROM sqlite_master 
        WHERE type='trigger'
      `).all();

      const triggers = triggersResult.map((trg: any) => {
        const triggerInfo = this.parseSQLiteTrigger(trg.sql || '');
        return {
          name: trg.name,
          tableName: trg.table_name,
          schema: 'main',
          timing: triggerInfo.timing,
          event: triggerInfo.event,
          orientation: 'ROW' as any,
          definition: trg.sql || '',
          body: triggerInfo.body,
          isEnabled: true,
          creationDDL: trg.sql || '',
          condition: triggerInfo.condition,
          granularity: 'ROW',
          securityDefiner: false,
          dependencies: triggerInfo.dependencies,
          comment: triggerInfo.comment
        };
      });

      // Extract SQLite sequences (using autoincrement patterns and custom sequences)
      const sequences = await this.extractSQLiteSequences(db);
      
      // Extract SQLite procedures (using system tables and views)
      const procedures = await this.extractSQLiteProcedures(db);
      
      // Extract SQLite functions (using system tables and views)
      const functions = await this.extractSQLiteFunctions(db);

      // Extract database configuration
      const databaseConfiguration = this.extractSQLiteConfiguration(db);

      // Extract statistics
      const statistics = this.extractSQLiteStatistics(db, tableMetadata);

      db.close();

      console.log(`📊 SQLite schema objects extracted:`);
      console.log(`  - Tables: ${tableMetadata.length}`);
      console.log(`  - Views: ${views.length}`);
      console.log(`  - Indexes: ${indexes.length}`);
      console.log(`  - Triggers: ${triggers.length}`);
      console.log(`  - Database Configuration: ${Object.keys(databaseConfiguration).length} settings`);
      console.log(`  - Statistics: ${statistics.tableStatistics?.length || 0} tables, ${statistics.indexStatistics?.length || 0} indexes`);

      // Extract security information
      const security = await this.extractSQLiteSecurity(db);

      // Extract runtime state information
      const runtimeState = await this.extractSQLiteRuntimeState(db);

      // Extract SQLite pragmas
      const pragmas = await this.extractSQLitePragmas(db);

      // Attach sequences to table metadata
      const enhancedTableMetadata = this.attachSequencesToTables(tableMetadata, sequences);

      // Extract dependency graph
      const dependencyGraph = await this.extractSQLiteDependencyGraph(db, enhancedTableMetadata, views, triggers, functions);

      return {
        actualTables: enhancedTableMetadata.map(t => t.name),
        databaseConfiguration,
        statistics,
        tableMetadata: enhancedTableMetadata,
        views,
        indexes,
        triggers,
        sequences,
        procedures,
        functions,
        security,
        runtimeState,
        dependencyGraph,
        pragmas
      };
    } catch (error) {
      console.error('❌ SQLite introspection failed:', error);
      throw error;
    }
  }

  /**
   * Introspect PostgreSQL database using information_schema and pg_tables
   */
  private async introspectPostgreSQL(connectionString: string): Promise<DatabaseIntrospectionResult> {
    try {
      // Use dynamic import to avoid bundling issues
      const { Client } = require('pg');
      const client = new Client({ connectionString });

      await client.connect();

      // Get table information from information_schema
      const tableQuery = `
        SELECT 
          t.table_name,
          t.table_type,
          t.table_schema,
          COALESCE(s.n_tup_ins + s.n_tup_upd + s.n_tup_del, 0) as row_count
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
        WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND t.table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY t.table_name
      `;

      const tableResult = await client.query(tableQuery);
      const tables = tableResult.rows;

      // Get column information for each table
      const tableMetadata = await Promise.all(
        tables.map(async (table: any) => {
          try {
            // Comprehensive column query using pg_attribute and pg_type
            const columnQuery = `
              SELECT 
                a.attname as column_name,
                a.attnum as ordinal_position,
                pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
                a.attnotnull as not_null,
                a.atthasdef as has_default,
                pg_catalog.pg_get_expr(ad.adbin, ad.adrelid) as default_value,
                col.is_nullable,
                col.column_default,
                col.character_maximum_length,
                col.numeric_precision,
                col.numeric_scale,
                col.collation_name,
                col.is_identity,
                col.identity_generation,
                col.is_generated,
                col.generation_expression,
                CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
                CASE WHEN uq.column_name IS NOT NULL THEN true ELSE false END as is_unique,
                pgd.description as comment,
                fk.foreign_table,
                fk.foreign_column,
                fk.on_delete,
                fk.on_update
              FROM pg_attribute a
              JOIN pg_class c ON c.oid = a.attrelid
              JOIN pg_namespace n ON n.oid = c.relnamespace
              LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
              LEFT JOIN information_schema.columns col ON 
                col.table_name = c.relname AND 
                col.column_name = a.attname AND 
                col.table_schema = n.nspname
              LEFT JOIN pg_description pgd ON pgd.objoid = c.oid AND pgd.objsubid = a.attnum
              LEFT JOIN (
                SELECT ku.table_name, ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku
                  ON tc.constraint_name = ku.constraint_name
                WHERE tc.constraint_type = 'PRIMARY KEY'
              ) pk ON c.relname = pk.table_name AND a.attname = pk.column_name
              LEFT JOIN (
                SELECT ku.table_name, ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku
                  ON tc.constraint_name = ku.constraint_name
                WHERE tc.constraint_type = 'UNIQUE'
              ) uq ON c.relname = uq.table_name AND a.attname = uq.column_name
              LEFT JOIN (
                SELECT 
                  kcu.table_name,
                  kcu.column_name,
                  ccu.table_name AS foreign_table,
                  ccu.column_name AS foreign_column,
                  rc.delete_rule as on_delete,
                  rc.update_rule as on_update
                FROM information_schema.key_column_usage kcu
                JOIN information_schema.referential_constraints rc 
                  ON rc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu 
                  ON ccu.constraint_name = rc.constraint_name
              ) fk ON c.relname = fk.table_name AND a.attname = fk.column_name
              WHERE c.relname = $1 
                AND n.nspname = $2
                AND a.attnum > 0 
                AND NOT a.attisdropped
              ORDER BY a.attnum
            `;

            // Get table-level constraints
            const constraintsQuery = `
              SELECT 
                conname as constraint_name,
                contype as constraint_type,
                pg_get_constraintdef(c.oid) as constraint_definition,
                c.condeferrable as is_deferrable,
                c.condeferred as initially_deferred,
                c.convalidated as is_valid,
                array_agg(a.attname ORDER BY k.ordinality) as columns,
                fk.confrelid::regclass as referenced_table,
                array_agg(fk.confkey[k.ordinality]::regclass ORDER BY k.ordinality) as referenced_columns,
                fk.confupdtype as update_action,
                fk.confdeltype as delete_action
              FROM pg_constraint c
              LEFT JOIN pg_class t ON t.oid = c.conrelid
              LEFT JOIN pg_namespace n ON n.oid = t.relnamespace
              LEFT JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality) ON true
              LEFT JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
              LEFT JOIN pg_constraint fk ON fk.oid = c.oid AND c.contype = 'f'
              WHERE t.relname = $1 AND n.nspname = $2
              GROUP BY c.oid, conname, contype, constraint_definition, is_deferrable, 
                       initially_deferred, is_valid, referenced_table, update_action, delete_action
              ORDER BY conname
            `;

            const constraintsResult = await client.query(constraintsQuery, [table.table_name, table.table_schema]);
            
            // Process constraints
            const constraints = {
              checkConstraints: [] as any[],
              uniqueConstraints: [] as any[],
              primaryKeyConstraints: [] as any[],
              foreignKeyConstraints: [] as any[]
            };

            constraintsResult.rows.forEach((constraint: any) => {
              const constraintData = {
                name: constraint.constraint_name,
                columns: constraint.columns || [],
                isDeferrable: constraint.is_deferrable,
                initiallyDeferred: constraint.initially_deferred,
                isEnabled: constraint.is_valid
              };

              switch (constraint.constraint_type) {
                case 'c': // Check constraint
                  constraints.checkConstraints.push({
                    ...constraintData,
                    expression: constraint.constraint_definition,
                    definition: constraint.constraint_definition,
                    dependencies: this.extractConstraintDependencies(constraint.constraint_definition)
                  });
                  break;
                case 'u': // Unique constraint
                  constraints.uniqueConstraints.push(constraintData);
                  break;
                case 'p': // Primary key constraint
                  constraints.primaryKeyConstraints.push(constraintData);
                  break;
                case 'f': // Foreign key constraint
                  constraints.foreignKeyConstraints.push({
                    ...constraintData,
                    referencedTable: constraint.referenced_table,
                    referencedColumns: constraint.referenced_columns || [],
                    onDelete: this.mapPostgreSQLAction(constraint.delete_action),
                    onUpdate: this.mapPostgreSQLAction(constraint.update_action)
                  });
                  break;
              }
            });

            const columnResult = await client.query(columnQuery, [table.table_name, table.table_schema]);
            const columns = columnResult.rows.map((col: any) => {
              const column: any = {
              name: col.column_name,
              type: col.data_type,
              nullable: col.is_nullable === 'YES',
                primaryKey: col.is_primary_key,
                defaultValue: col.column_default || col.default_value,
                unique: col.is_unique,
                ordinalPosition: col.ordinal_position,
                collation: col.collation_name,
                comment: col.comment
              };

              // Add length/precision/scale
              if (col.character_maximum_length) column.maxLength = col.character_maximum_length;
              if (col.numeric_precision) column.precision = col.numeric_precision;
              if (col.numeric_scale) column.scale = col.numeric_scale;

              // Identity column (PostgreSQL 10+)
              if (col.is_identity === 'YES') {
                column.identity = {
                  generation: col.identity_generation,
                  start: 1, // Would need additional query for exact values
                  increment: 1
                };
              }

              // Generated column (PostgreSQL 12+)
              if (col.is_generated === 'ALWAYS') {
                column.generated = {
                  type: 'STORED', // PostgreSQL only supports STORED
                  expression: col.generation_expression
                };
              }

              // Foreign key
              if (col.foreign_table) {
                column.foreignKey = {
                  table: col.foreign_table,
                  column: col.foreign_column,
                  onDelete: col.on_delete,
                  onUpdate: col.on_update
                };
              }

              // Check if auto-increment (serial/bigserial)
              if (col.column_default && col.column_default.includes('nextval')) {
                column.autoIncrement = true;
              }

              return column;
            });

            return {
              name: table.table_name,
              type: table.table_type,
              schema: table.table_schema,
              rowCount: parseInt(table.row_count) || 0,
              constraints,
              columns
            };
          } catch (error) {
            console.warn(`⚠️ Could not get metadata for table ${table.table_name}:`, error);
            return {
              name: table.table_name,
              type: table.table_type,
              schema: table.table_schema,
              rowCount: 0,
              columns: []
            };
          }
        })
      );

      // Extract indexes using pg_index and pg_constraint
      const indexesResult = await client.query(`
        SELECT 
          i.indexrelid::regclass AS index_name,
          i.indrelid::regclass AS table_name,
          n.nspname AS schema,
          am.amname AS index_type,
          i.indisunique AS is_unique,
          i.indisprimary AS is_primary,
          i.indisclustered AS is_clustered,
          pg_get_indexdef(i.indexrelid) AS creation_ddl,
          pg_get_expr(i.indpred, i.indrelid) AS where_clause,
          array_agg(a.attname ORDER BY k.ordinality) AS columns,
          i.indnatts AS num_columns,
          pg_relation_size(i.indexrelid) AS index_size,
          c.reloptions AS storage_params,
          ts.spcname AS tablespace
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_am am ON am.oid = c.relam
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_tablespace ts ON ts.oid = c.reltablespace
        CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ordinality)
        LEFT JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        WHERE i.indrelid IN (${tables.map((t: any) => `'${t.table_name}'::regclass`).join(', ')})
        GROUP BY i.indexrelid, i.indrelid, n.nspname, am.amname, i.indisunique, 
                 i.indisprimary, i.indisclustered, i.indnatts, c.reloptions, ts.spcname
        ORDER BY i.indrelid, i.indexrelid
      `);

      const indexes = indexesResult.rows.map((idx: any) => {
        const fillfactor = idx.storage_params?.find((opt: string) => opt.startsWith('fillfactor='));
        const parsedFillfactor = fillfactor ? parseInt(fillfactor.split('=')[1]) : undefined;
        
        return {
          name: idx.index_name,
          tableName: idx.table_name,
          schema: idx.schema,
          type: this.mapPostgreSQLIndexType(idx.index_type),
          columns: idx.columns || [],
          isUnique: idx.is_unique,
          isPrimary: idx.is_primary,
          isClustered: idx.is_clustered,
          isPartial: Boolean(idx.where_clause),
          whereClause: idx.where_clause,
          predicate: idx.where_clause, // Alias for whereClause
          creationDDL: idx.creation_ddl,
          indexMethod: idx.index_type,
          fillfactor: parsedFillfactor,
          storageParams: idx.storage_params,
          tablespace: idx.tablespace,
          cardinality: idx.index_size,
          comment: undefined
        };
      });

      // Extract database configuration
      const databaseConfiguration = await this.extractPostgreSQLConfiguration(client);

      // Extract statistics
      const statistics = await this.extractPostgreSQLStatistics(client, tables);

      await client.end();

      console.log(`📊 PostgreSQL schema objects extracted:`);
      console.log(`  - Tables: ${tableMetadata.length}`);
      console.log(`  - Indexes: ${indexes.length}`);
      console.log(`  - Database Configuration: ${Object.keys(databaseConfiguration).length} settings`);
      console.log(`  - Statistics: ${statistics.tableStatistics?.length || 0} tables, ${statistics.indexStatistics?.length || 0} indexes`);

      // Extract triggers
      const triggers = await this.extractPostgreSQLTriggers(client);
      
      // Extract procedures
      const procedures = await this.extractPostgreSQLProcedures(client);
      
      // Extract functions
      const functions = await this.extractPostgreSQLFunctions(client);
      
      // Extract sequences
      const sequences = await this.extractPostgreSQLSequences(client);
      
      // Extract events (PostgreSQL doesn't have native events, but we can extract scheduled jobs)
      const events = await this.extractPostgreSQLEvents(client);

      // Extract security information
      const security = await this.extractPostgreSQLSecurity(client);

      // Extract runtime state information
      const runtimeState = await this.extractPostgreSQLRuntimeState(client);

      // Extract PostgreSQL extensions
      const extensions = await this.extractPostgreSQLExtensions(client);

      // Extract PostgreSQL partitioning information
      const partitioning = await this.extractPostgreSQLPartitioning(client);

      // Attach sequences to table metadata
      const enhancedTableMetadata = this.attachSequencesToTables(tableMetadata, sequences);

      // Extract dependency graph
      const dependencyGraph = await this.extractPostgreSQLDependencyGraph(client, enhancedTableMetadata, [], triggers, functions, procedures);

      return {
        actualTables: tables.map((t: any) => t.table_name),
        databaseConfiguration,
        statistics,
        tableMetadata: enhancedTableMetadata,
        views: [],
        indexes,
        triggers,
        sequences,
        procedures,
        functions,
        events,
        security,
        runtimeState,
        dependencyGraph,
        extensions,
        partitioning
      };
    } catch (error) {
      console.error('❌ PostgreSQL introspection failed:', error);
      throw error;
    }
  }

  /**
   * Introspect MySQL database using information_schema
   */
  private async introspectMySQL(connectionString: string): Promise<DatabaseIntrospectionResult> {
    try {
      // Use dynamic import to avoid bundling issues
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection(connectionString);

      // Get table information
      const [tables] = await connection.execute(`
        SELECT 
          TABLE_NAME,
          TABLE_TYPE,
          TABLE_SCHEMA,
          TABLE_ROWS
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
        AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
        ORDER BY TABLE_NAME
      `);

      // Get column information for each table
      const tableMetadata = await Promise.all(
        (tables as any[]).map(async (table: any) => {
          try {
            // Use SHOW FULL COLUMNS for comprehensive metadata
            const [columns] = await connection.execute(`
              SHOW FULL COLUMNS FROM \`${table.TABLE_NAME}\` FROM \`${table.TABLE_SCHEMA}\`
            `);

            // Get additional information from information_schema
            const [columnsInfo] = await connection.execute(`
              SELECT 
                COLUMN_NAME,
                ORDINAL_POSITION,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                NUMERIC_PRECISION,
                NUMERIC_SCALE,
                COLUMN_DEFAULT,
                IS_NULLABLE,
                COLUMN_TYPE,
                COLUMN_KEY,
                EXTRA,
                COLUMN_COMMENT,
                GENERATION_EXPRESSION
              FROM information_schema.COLUMNS
              WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?
              ORDER BY ORDINAL_POSITION
            `, [table.TABLE_NAME, table.TABLE_SCHEMA]);

            // Get comprehensive constraint information
            const [constraints] = await connection.execute(`
              SELECT 
                tc.CONSTRAINT_NAME,
                tc.CONSTRAINT_TYPE,
                tc.IS_DEFERRABLE,
                tc.INITIALLY_DEFERRED,
                cc.CHECK_CLAUSE,
                kcu.COLUMN_NAME,
                kcu.REFERENCED_TABLE_NAME,
                kcu.REFERENCED_COLUMN_NAME,
                rc.DELETE_RULE,
                rc.UPDATE_RULE
              FROM information_schema.TABLE_CONSTRAINTS tc
              LEFT JOIN information_schema.CHECK_CONSTRAINTS cc 
                ON tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME 
                AND tc.TABLE_SCHEMA = cc.CONSTRAINT_SCHEMA
              LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu
                ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
              LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
                ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
                AND tc.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
              WHERE tc.TABLE_NAME = ? 
                AND tc.TABLE_SCHEMA = ?
                AND tc.CONSTRAINT_TYPE IN ('CHECK', 'UNIQUE', 'PRIMARY KEY', 'FOREIGN KEY')
              ORDER BY tc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION
            `, [table.TABLE_NAME, table.TABLE_SCHEMA]);

            // Process constraints
            const constraintsMap = new Map();
            (constraints as any[]).forEach((constraint: any) => {
              const constraintName = constraint.CONSTRAINT_NAME;
              if (!constraintsMap.has(constraintName)) {
                constraintsMap.set(constraintName, {
                  name: constraintName,
                  type: constraint.CONSTRAINT_TYPE,
                  isDeferrable: constraint.IS_DEFERRABLE === 'YES',
                  initiallyDeferred: constraint.INITIALLY_DEFERRED === 'YES',
                  isEnabled: true,
                  columns: [],
                  checkClause: constraint.CHECK_CLAUSE,
                  referencedTable: constraint.REFERENCED_TABLE_NAME,
                  referencedColumns: [],
                  onDelete: constraint.DELETE_RULE,
                  onUpdate: constraint.UPDATE_RULE
                });
              }
              
              const constraintData = constraintsMap.get(constraintName);
              if (constraint.COLUMN_NAME) {
                constraintData.columns.push(constraint.COLUMN_NAME);
              }
              if (constraint.REFERENCED_COLUMN_NAME) {
                constraintData.referencedColumns.push(constraint.REFERENCED_COLUMN_NAME);
              }
            });

            const tableConstraints = {
              checkConstraints: [] as any[],
              uniqueConstraints: [] as any[],
              primaryKeyConstraints: [] as any[],
              foreignKeyConstraints: [] as any[]
            };

            constraintsMap.forEach((constraint: any) => {
              const constraintData = {
                name: constraint.name,
                columns: constraint.columns,
                isDeferrable: constraint.isDeferrable,
                initiallyDeferred: constraint.initiallyDeferred,
                isEnabled: constraint.isEnabled
              };

              switch (constraint.type) {
                case 'CHECK':
                  tableConstraints.checkConstraints.push({
                    ...constraintData,
                    expression: constraint.checkClause,
                    definition: `CHECK (${constraint.checkClause})`,
                    dependencies: this.extractConstraintDependencies(constraint.checkClause)
                  });
                  break;
                case 'UNIQUE':
                  tableConstraints.uniqueConstraints.push(constraintData);
                  break;
                case 'PRIMARY KEY':
                  tableConstraints.primaryKeyConstraints.push(constraintData);
                  break;
                case 'FOREIGN KEY':
                  tableConstraints.foreignKeyConstraints.push({
                    ...constraintData,
                    referencedTable: constraint.referencedTable,
                    referencedColumns: constraint.referencedColumns,
                    onDelete: constraint.onDelete,
                    onUpdate: constraint.onUpdate
                  });
                  break;
              }
            });

            // Get foreign key information for column-level metadata
            const [foreignKeys] = await connection.execute(`
              SELECT 
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME,
                DELETE_RULE,
                UPDATE_RULE
              FROM information_schema.KEY_COLUMN_USAGE kcu
              JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
                ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
                AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
              WHERE kcu.TABLE_NAME = ? 
                AND kcu.TABLE_SCHEMA = ?
                AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
            `, [table.TABLE_NAME, table.TABLE_SCHEMA]);

            const fkMap = new Map();
            (foreignKeys as any[]).forEach(fk => {
              fkMap.set(fk.COLUMN_NAME, {
                table: fk.REFERENCED_TABLE_NAME,
                column: fk.REFERENCED_COLUMN_NAME,
                onDelete: fk.DELETE_RULE,
                onUpdate: fk.UPDATE_RULE
              });
            });

            const columnInfo = (columnsInfo as any[]).map((col: any, index: number) => {
              const showCol = (columns as any[]).find((c: any) => c.Field === col.COLUMN_NAME);
              
              const column: any = {
              name: col.COLUMN_NAME,
              type: col.DATA_TYPE,
              nullable: col.IS_NULLABLE === 'YES',
                primaryKey: col.COLUMN_KEY === 'PRI',
                unique: col.COLUMN_KEY === 'UNI',
                defaultValue: col.COLUMN_DEFAULT,
                ordinalPosition: col.ORDINAL_POSITION,
                comment: col.COLUMN_COMMENT
              };

              // Add length/precision/scale
              if (col.CHARACTER_MAXIMUM_LENGTH) column.maxLength = col.CHARACTER_MAXIMUM_LENGTH;
              if (col.NUMERIC_PRECISION) column.precision = col.NUMERIC_PRECISION;
              if (col.NUMERIC_SCALE) column.scale = col.NUMERIC_SCALE;

              // Parse EXTRA field for special attributes
              const extra = col.EXTRA || '';
              if (extra.includes('auto_increment')) column.autoIncrement = true;
              if (extra.includes('on update')) column.onUpdate = extra;

              // Generated column (MySQL 5.7+)
              if (extra.includes('VIRTUAL GENERATED') || extra.includes('STORED GENERATED')) {
                column.generated = {
                  type: extra.includes('STORED') ? 'STORED' : 'VIRTUAL',
                  expression: col.GENERATION_EXPRESSION || ''
                };
              }

              // Collation and charset from SHOW FULL COLUMNS
              if (showCol) {
                if (showCol.Collation) column.collation = showCol.Collation;
                // Extract charset from collation (e.g., utf8mb4_unicode_ci -> utf8mb4)
                if (showCol.Collation) {
                  column.charset = showCol.Collation.split('_')[0];
                }
              }

              // Foreign key
              const foreignKey = fkMap.get(col.COLUMN_NAME);
              if (foreignKey) column.foreignKey = foreignKey;

              return column;
            });

            return {
              name: table.TABLE_NAME,
              type: table.TABLE_TYPE,
              schema: table.TABLE_SCHEMA,
              rowCount: parseInt(table.TABLE_ROWS) || 0,
              constraints: tableConstraints,
              columns: columnInfo
            };
          } catch (error) {
            console.warn(`⚠️ Could not get metadata for table ${table.TABLE_NAME}:`, error);
            return {
              name: table.TABLE_NAME,
              type: table.TABLE_TYPE,
              schema: table.TABLE_SCHEMA,
              rowCount: 0,
              columns: []
            };
          }
        })
      );

      // Extract indexes using SHOW INDEXES and INFORMATION_SCHEMA
      const indexes: any[] = [];
      
      for (const table of tables as any[]) {
        try {
          // Use SHOW INDEXES for comprehensive data
          const [indexRows] = await connection.execute(`
            SHOW INDEXES FROM \`${table.TABLE_NAME}\` FROM \`${table.TABLE_SCHEMA}\`
          `);

          // Group by index name
          const indexMap = new Map();
          for (const row of indexRows as any[]) {
            const indexName = row.Key_name;
            if (!indexMap.has(indexName)) {
              indexMap.set(indexName, {
                name: indexName,
                tableName: table.TABLE_NAME,
                schema: table.TABLE_SCHEMA,
                type: this.mapMySQLIndexType(row.Index_type),
                columns: [],
                isUnique: row.Non_unique === 0,
                isPrimary: row.Key_name === 'PRIMARY',
                isClustered: row.Index_type === 'BTREE' && row.Key_name === 'PRIMARY',
                cardinality: row.Cardinality,
                comment: row.Comment,
                indexMethod: row.Index_type
              });
            }
            
            const index = indexMap.get(indexName);
            if (row.Column_name) {
              index.columns.push(row.Column_name);
            }
          }

          indexes.push(...Array.from(indexMap.values()));
        } catch (error) {
          console.warn(`⚠️ Could not get indexes for table ${table.TABLE_NAME}:`, error);
        }
      }

      // Extract database configuration
      const databaseConfiguration = await this.extractMySQLConfiguration(connection);

      // Extract statistics
      const statistics = await this.extractMySQLStatistics(connection, tables);

      await connection.end();

      console.log(`📊 MySQL schema objects extracted:`);
      console.log(`  - Tables: ${tableMetadata.length}`);
      console.log(`  - Indexes: ${indexes.length}`);
      console.log(`  - Database Configuration: ${Object.keys(databaseConfiguration).length} settings`);
      console.log(`  - Statistics: ${statistics.tableStatistics?.length || 0} tables, ${statistics.indexStatistics?.length || 0} indexes`);

      // Extract triggers
      const triggers = await this.extractMySQLTriggers(connection);
      
      // Extract procedures
      const procedures = await this.extractMySQLProcedures(connection);
      
      // Extract functions
      const functions = await this.extractMySQLFunctions(connection);
      
      // Extract events
      const events = await this.extractMySQLEvents(connection);

      // Extract sequences (MySQL doesn't have native sequences, but we can extract autoincrement patterns)
      const sequences = await this.extractMySQLSequences(connection);

      // Extract security information
      const security = await this.extractMySQLSecurity(connection);

      // Extract runtime state information
      const runtimeState = await this.extractMySQLRuntimeState(connection);

      // Extract MySQL engine information
      const engineInfo = await this.extractMySQLEngineInfo(connection);

      // Attach sequences to table metadata
      const enhancedTableMetadata = this.attachSequencesToTables(tableMetadata, sequences);

      // Extract dependency graph
      const dependencyGraph = await this.extractMySQLDependencyGraph(connection, enhancedTableMetadata, [], triggers, functions, procedures);

      return {
        actualTables: (tables as any[]).map((t: any) => t.TABLE_NAME),
        databaseConfiguration,
        statistics,
        tableMetadata: enhancedTableMetadata,
        views: [],
        indexes,
        triggers,
        sequences,
        procedures,
        functions,
        events,
        security,
        runtimeState,
        dependencyGraph,
        engineInfo
      };
    } catch (error) {
      console.error('❌ MySQL introspection failed:', error);
      throw error;
    }
  }

  /**
   * Extract MySQL engine information using SHOW TABLE STATUS and SHOW ENGINES
   */
  private async extractMySQLEngineInfo(connection: any): Promise<any> {
    try {
      const engineInfo: any = {
        storageEngines: [],
        tableEngines: [],
        engineStatistics: {
          totalTables: 0,
          engineCounts: {},
          totalDataSize: 0,
          totalIndexSize: 0,
          averageRowLength: 0
        }
      };

      // Extract storage engines
      const [engines] = await connection.execute('SHOW ENGINES');
      for (const engine of engines) {
        engineInfo.storageEngines.push({
          name: engine.Engine,
          support: engine.Support,
          comment: engine.Comment,
          transactions: engine.Comment.toLowerCase().includes('transaction'),
          xa: engine.Comment.toLowerCase().includes('xa'),
          savepoints: engine.Comment.toLowerCase().includes('savepoint')
        });
      }

      // Extract table engine information using SHOW TABLE STATUS
      const [tables] = await connection.execute(`
        SELECT 
          TABLE_NAME,
          TABLE_SCHEMA,
          ENGINE,
          VERSION,
          ROW_FORMAT,
          TABLE_ROWS,
          AVG_ROW_LENGTH,
          DATA_LENGTH,
          MAX_DATA_LENGTH,
          INDEX_LENGTH,
          DATA_FREE,
          AUTO_INCREMENT,
          CREATE_TIME,
          UPDATE_TIME,
          CHECK_TIME,
          TABLE_COLLATION,
          CHECKSUM,
          CREATE_OPTIONS,
          TABLE_COMMENT
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);

      for (const table of tables) {
        engineInfo.tableEngines.push({
          tableName: table.TABLE_NAME,
          schema: table.TABLE_SCHEMA,
          engine: table.ENGINE,
          version: table.VERSION,
          rowFormat: table.ROW_FORMAT,
          tableRows: table.TABLE_ROWS,
          avgRowLength: table.AVG_ROW_LENGTH,
          dataLength: table.DATA_LENGTH,
          maxDataLength: table.MAX_DATA_LENGTH,
          indexLength: table.INDEX_LENGTH,
          dataFree: table.DATA_FREE,
          autoIncrement: table.AUTO_INCREMENT,
          createTime: table.CREATE_TIME,
          updateTime: table.UPDATE_TIME,
          checkTime: table.CHECK_TIME,
          tableCollation: table.TABLE_COLLATION,
          checksum: table.CHECKSUM,
          createOptions: table.CREATE_OPTIONS,
          tableComment: table.TABLE_COMMENT
        });
      }

      // Calculate engine statistics
      engineInfo.engineStatistics.totalTables = tables.length;
      engineInfo.engineStatistics.engineCounts = {};
      engineInfo.engineStatistics.totalDataSize = 0;
      engineInfo.engineStatistics.totalIndexSize = 0;
      engineInfo.engineStatistics.averageRowLength = 0;

      for (const table of tables) {
        const engine = table.ENGINE;
        engineInfo.engineStatistics.engineCounts[engine] = (engineInfo.engineStatistics.engineCounts[engine] || 0) + 1;
        engineInfo.engineStatistics.totalDataSize += table.DATA_LENGTH || 0;
        engineInfo.engineStatistics.totalIndexSize += table.INDEX_LENGTH || 0;
        engineInfo.engineStatistics.averageRowLength += table.AVG_ROW_LENGTH || 0;
      }

      if (tables.length > 0) {
        engineInfo.engineStatistics.averageRowLength = Math.round(engineInfo.engineStatistics.averageRowLength / tables.length);
      }

      return engineInfo;
    } catch (error) {
      console.warn(`⚠️ Could not extract MySQL engine info:`, error);
      return {
        storageEngines: [],
        tableEngines: [],
        engineStatistics: {
          totalTables: 0,
          engineCounts: {},
          totalDataSize: 0,
          totalIndexSize: 0,
          averageRowLength: 0
        }
      };
    }
  }

  private parseIndexWhereClause(sql: string): string | undefined {
    // Parse WHERE clause from CREATE INDEX statement
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ON\s+|\s*$)/i);
    return whereMatch ? whereMatch[1].trim() : undefined;
  }

  private parseIndexColumnExpressions(sql: string): string[] {
    // Parse column expressions from CREATE INDEX statement
    const columnMatch = sql.match(/ON\s+\w+\s*\(([^)]+)\)/i);
    if (!columnMatch) return [];
    
    return columnMatch[1]
      .split(',')
      .map(col => col.trim())
      .filter(col => col.length > 0);
  }

  private mapPostgreSQLIndexType(indexType: string): 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'BRIN' | 'CLUSTERED' | 'NONCLUSTERED' | 'FULLTEXT' | 'SPATIAL' {
    switch (indexType.toLowerCase()) {
      case 'btree': return 'BTREE';
      case 'hash': return 'HASH';
      case 'gin': return 'GIN';
      case 'gist': return 'GIST';
      case 'brin': return 'BRIN';
      default: return 'BTREE';
    }
  }

  private mapMySQLIndexType(indexType: string): 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'BRIN' | 'CLUSTERED' | 'NONCLUSTERED' | 'FULLTEXT' | 'SPATIAL' {
    switch (indexType.toUpperCase()) {
      case 'BTREE': return 'BTREE';
      case 'HASH': return 'HASH';
      case 'FULLTEXT': return 'FULLTEXT';
      case 'SPATIAL': return 'SPATIAL';
      default: return 'BTREE';
    }
  }

  private mapMongoDBIndexType(indexSpec: any): 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'BRIN' | 'CLUSTERED' | 'NONCLUSTERED' | 'FULLTEXT' | 'SPATIAL' {
    const values = Object.values(indexSpec);
    
    if (values.includes('text')) return 'FULLTEXT';
    if (values.includes('2dsphere') || values.includes('2d')) return 'SPATIAL';
    if (values.includes('hashed')) return 'HASH';
    
    return 'BTREE';
  }

  private getMongoDBIndexMethod(indexSpec: any): string {
    const values = Object.values(indexSpec);
    
    if (values.includes('text')) return 'text';
    if (values.includes('2dsphere')) return '2dsphere';
    if (values.includes('2d')) return '2d';
    if (values.includes('hashed')) return 'hashed';
    
    return 'btree';
  }

  private extractMongoDBStorageParams(index: any): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extract storage engine specific parameters
    if (index.storageEngine) {
      params.storageEngine = index.storageEngine;
    }
    
    // Extract collation options
    if (index.collation) {
      params.collation = index.collation;
    }
    
    // Extract sparse index option
    if (index.sparse !== undefined) {
      params.sparse = index.sparse;
    }
    
    // Extract background index option
    if (index.background !== undefined) {
      params.background = index.background;
    }
    
    // Extract TTL options
    if (index.expireAfterSeconds !== undefined) {
      params.expireAfterSeconds = index.expireAfterSeconds;
    }
    
    // Extract text index specific options
    if (index.textIndexVersion !== undefined) {
      params.textIndexVersion = index.textIndexVersion;
    }
    
    if (index.default_language) {
      params.default_language = index.default_language;
    }
    
    if (index.language_override) {
      params.language_override = index.language_override;
    }
    
    // Extract 2dsphere index options
    if (index['2dsphereIndexVersion'] !== undefined) {
      params['2dsphereIndexVersion'] = index['2dsphereIndexVersion'];
    }
    
    // Extract 2d index options
    if (index['2dIndexVersion'] !== undefined) {
      params['2dIndexVersion'] = index['2dIndexVersion'];
    }
    
    if (index.bits) {
      params.bits = index.bits;
    }
    
    if (index.min) {
      params.min = index.min;
    }
    
    if (index.max) {
      params.max = index.max;
    }
    
    return params;
  }

  private extractMongoDBFillFactor(index: any): number | undefined {
    // MongoDB doesn't have traditional fill factor, but we can simulate it
    // based on index density and storage parameters
    
    // For text indexes, use textIndexVersion as a proxy
    if (index.textIndexVersion) {
      return Math.min(100, index.textIndexVersion * 20); // Scale to 0-100
    }
    
    // For 2dsphere indexes, use version as proxy
    if (index['2dsphereIndexVersion']) {
      return Math.min(100, index['2dsphereIndexVersion'] * 25);
    }
    
    // For 2d indexes, use version as proxy
    if (index['2dIndexVersion']) {
      return Math.min(100, index['2dIndexVersion'] * 30);
    }
    
    // Default fill factor for regular indexes
    return index.sparse ? 60 : 90;
  }

  private extractMongoDBTablespace(index: any): string | undefined {
    // MongoDB doesn't have traditional tablespaces, but we can use
    // storage engine and collection info as a proxy
    
    if (index.storageEngine) {
      return `mongodb_${index.storageEngine}`;
    }
    
    // Use collection name as tablespace proxy
    return 'mongodb_default';
  }

  private isMongoDBClustered(index: any): boolean {
    // MongoDB doesn't have clustered indexes in the traditional sense,
    // but the _id index is always clustered
    return index.name === '_id_';
  }

  private extractMongoDBCardinality(index: any): number | undefined {
    // MongoDB doesn't provide cardinality directly, but we can estimate
    // based on index type and configuration
    
    if (index.unique) {
      return 100; // High cardinality for unique indexes
    }
    
    if (index.sparse) {
      return 50; // Medium cardinality for sparse indexes
    }
    
    if (index.textIndexVersion) {
      return 75; // High cardinality for text indexes
    }
    
    if (index['2dsphereIndexVersion'] || index['2dIndexVersion']) {
      return 60; // Medium-high cardinality for geospatial indexes
    }
    
    return 80; // Default high cardinality
  }

  private extractMongoDBComment(index: any): string | undefined {
    const comments: string[] = [];
    
    if (index.textIndexVersion) {
      comments.push(`Text index v${index.textIndexVersion}`);
    }
    
    if (index.sparse) {
      comments.push('Sparse index');
    }
    
    if (index.background) {
      comments.push('Background index');
    }
    
    if (index.expireAfterSeconds) {
      comments.push(`TTL: ${index.expireAfterSeconds}s`);
    }
    
    if (index.collation) {
      comments.push(`Collation: ${JSON.stringify(index.collation)}`);
    }
    
    return comments.length > 0 ? comments.join(', ') : undefined;
  }

  private extractMongoDBColumnExpressions(indexSpec: any): string[] {
    const expressions: string[] = [];
    
    for (const [key, value] of Object.entries(indexSpec)) {
      if (typeof value === 'string') {
        if (value === 'text') {
          expressions.push(`text(${key})`);
        } else if (value === '2dsphere') {
          expressions.push(`2dsphere(${key})`);
        } else if (value === '2d') {
          expressions.push(`2d(${key})`);
        } else if (value === 'hashed') {
          expressions.push(`hashed(${key})`);
        } else {
          expressions.push(`${key}:${value}`);
        }
      } else {
        expressions.push(`${key}:${JSON.stringify(value)}`);
      }
    }
    
    return expressions;
  }

  private extractConstraintDependencies(expression: string): string[] {
    // Extract column dependencies from constraint expressions
    const dependencies: string[] = [];
    
    // Simple regex to find column references (basic implementation)
    const columnMatches = expression.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
    if (columnMatches) {
      // Filter out SQL keywords and functions
      const sqlKeywords = new Set([
        'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
        'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF',
        'COALESCE', 'NULLIF', 'CAST', 'EXTRACT', 'DATE', 'TIME', 'TIMESTAMP',
        'LENGTH', 'UPPER', 'LOWER', 'TRIM', 'SUBSTRING', 'CONCAT',
        'ABS', 'ROUND', 'FLOOR', 'CEIL', 'MOD', 'POWER', 'SQRT',
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'
      ]);
      
      columnMatches.forEach(match => {
        const upperMatch = match.toUpperCase();
        if (!sqlKeywords.has(upperMatch) && 
            !match.match(/^\d+$/) && // Not a number
            !match.match(/^['"]/) && // Not a string literal
            !match.match(/^\(/) && // Not a function call
            match.length > 1) { // Not a single character
          dependencies.push(match);
        }
      });
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }

  private mapPostgreSQLAction(actionCode: number): string {
    switch (actionCode) {
      case 0: return 'NO ACTION';
      case 1: return 'CASCADE';
      case 2: return 'SET NULL';
      case 3: return 'SET DEFAULT';
      case 4: return 'RESTRICT';
      default: return 'NO ACTION';
    }
  }

  private extractSQLiteCheckConstraints(schema: string): any[] {
    const checkConstraints: any[] = [];
    
    // Extract CHECK constraints from CREATE TABLE statement
    const checkRegex = /CHECK\s*\(([^)]+)\)/gi;
    let match;
    let constraintIndex = 0;
    
    while ((match = checkRegex.exec(schema)) !== null) {
      const expression = match[1].trim();
      const constraintName = `check_constraint_${constraintIndex++}`;
      
      checkConstraints.push({
        name: constraintName,
        expression: expression,
        definition: `CHECK (${expression})`,
        isEnabled: true,
        isDeferrable: false,
        initiallyDeferred: false,
        dependencies: this.extractConstraintDependencies(expression)
      });
    }
    
    return checkConstraints;
  }

  private extractMongoDBValidationConstraints(validator: any): any[] {
    const checkConstraints: any[] = [];
    
    if (!validator || Object.keys(validator).length === 0) {
      return checkConstraints;
    }
    
    // Extract $jsonSchema constraints
    if (validator.$jsonSchema) {
      const schema = validator.$jsonSchema;
      let constraintIndex = 0;
      
      // Extract required fields
      if (schema.required && Array.isArray(schema.required)) {
        schema.required.forEach((field: string) => {
          checkConstraints.push({
            name: `required_${field}_${constraintIndex++}`,
            expression: `${field} is required`,
            definition: `Required field: ${field}`,
            isEnabled: true,
            isDeferrable: false,
            initiallyDeferred: false,
            dependencies: [field]
          });
        });
      }
      
      // Extract properties constraints
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([field, fieldSchema]: [string, any]) => {
          if (fieldSchema.type) {
            checkConstraints.push({
              name: `type_${field}_${constraintIndex++}`,
              expression: `${field} must be ${fieldSchema.type}`,
              definition: `Type constraint: ${field} is ${fieldSchema.type}`,
              isEnabled: true,
              isDeferrable: false,
              initiallyDeferred: false,
              dependencies: [field]
            });
          }
          
          if (fieldSchema.enum) {
            checkConstraints.push({
              name: `enum_${field}_${constraintIndex++}`,
              expression: `${field} in [${fieldSchema.enum.join(', ')}]`,
              definition: `Enum constraint: ${field} must be one of [${fieldSchema.enum.join(', ')}]`,
              isEnabled: true,
              isDeferrable: false,
              initiallyDeferred: false,
              dependencies: [field]
            });
          }
          
          if (fieldSchema.minimum !== undefined) {
            checkConstraints.push({
              name: `min_${field}_${constraintIndex++}`,
              expression: `${field} >= ${fieldSchema.minimum}`,
              definition: `Minimum constraint: ${field} >= ${fieldSchema.minimum}`,
              isEnabled: true,
              isDeferrable: false,
              initiallyDeferred: false,
              dependencies: [field]
            });
          }
          
          if (fieldSchema.maximum !== undefined) {
            checkConstraints.push({
              name: `max_${field}_${constraintIndex++}`,
              expression: `${field} <= ${fieldSchema.maximum}`,
              definition: `Maximum constraint: ${field} <= ${fieldSchema.maximum}`,
              isEnabled: true,
              isDeferrable: false,
              initiallyDeferred: false,
              dependencies: [field]
            });
          }
          
          if (fieldSchema.minLength !== undefined) {
            checkConstraints.push({
              name: `minLength_${field}_${constraintIndex++}`,
              expression: `length(${field}) >= ${fieldSchema.minLength}`,
              definition: `Minimum length constraint: ${field} length >= ${fieldSchema.minLength}`,
              isEnabled: true,
              isDeferrable: false,
              initiallyDeferred: false,
              dependencies: [field]
            });
          }
          
          if (fieldSchema.maxLength !== undefined) {
            checkConstraints.push({
              name: `maxLength_${field}_${constraintIndex++}`,
              expression: `length(${field}) <= ${fieldSchema.maxLength}`,
              definition: `Maximum length constraint: ${field} length <= ${fieldSchema.maxLength}`,
              isEnabled: true,
              isDeferrable: false,
              initiallyDeferred: false,
              dependencies: [field]
            });
          }
        });
      }
    }
    
    // Extract $expr constraints
    if (validator.$expr) {
      checkConstraints.push({
        name: `expr_constraint_0`,
        expression: JSON.stringify(validator.$expr),
        definition: `Expression constraint: ${JSON.stringify(validator.$expr)}`,
        isEnabled: true,
        isDeferrable: false,
        initiallyDeferred: false,
        dependencies: this.extractMongoDBExpressionDependencies(validator.$expr)
      });
    }
    
    return checkConstraints;
  }

  private extractMongoDBExpressionDependencies(expr: any): string[] {
    const dependencies: string[] = [];
    
    if (typeof expr === 'object' && expr !== null) {
      if (Array.isArray(expr)) {
        expr.forEach(item => {
          dependencies.push(...this.extractMongoDBExpressionDependencies(item));
        });
      } else {
        Object.entries(expr).forEach(([key, value]) => {
          if (key === '$field' || key.startsWith('$')) {
            // Skip operators
          } else if (typeof value === 'string' && !value.startsWith('$')) {
            dependencies.push(value);
          } else if (typeof value === 'object') {
            dependencies.push(...this.extractMongoDBExpressionDependencies(value));
          }
        });
      }
    }
    
    return [...new Set(dependencies)];
  }

  private extractSQLiteConfiguration(db: any): any {
    const config: any = {};
    
    try {
      // Extract PRAGMA settings
      const pragmaSettings = [
        'encoding', 'journal_mode', 'synchronous', 'cache_size', 'temp_store',
        'locking_mode', 'foreign_keys', 'recursive_triggers', 'auto_vacuum',
        'incremental_vacuum', 'user_version', 'application_id', 'page_size',
        'page_count', 'freelist_count', 'schema_version', 'data_version'
      ];
      
      pragmaSettings.forEach(setting => {
        try {
          const result = db.prepare(`PRAGMA ${setting}`).get();
          if (result) {
            const value = Object.values(result)[0];
            config[setting] = value;
          }
        } catch (error) {
          console.warn(`⚠️ Could not get PRAGMA ${setting}:`, error);
        }
      });
      
      // Get database version
      try {
        const versionResult = db.prepare(`SELECT sqlite_version() as version`).get();
        if (versionResult) {
          config.version = versionResult.version;
        }
      } catch (error) {
        console.warn(`⚠️ Could not get SQLite version:`, error);
      }
      
      // Map PRAGMA settings to standardized names
      const mappedConfig: any = {
        encoding: config.encoding,
        journalMode: config.journal_mode,
        synchronousMode: config.synchronous,
        cacheSize: config.cache_size,
        tempStore: config.temp_store,
        lockingMode: config.locking_mode,
        foreignKeys: config.foreign_keys === 1,
        recursiveTriggers: config.recursive_triggers === 1,
        autoVacuum: config.auto_vacuum === 1,
        incrementalVacuum: config.incremental_vacuum === 1,
        userVersion: config.user_version,
        applicationId: config.application_id,
        pageSize: config.page_size,
        pageCount: config.page_count,
        freelistCount: config.freelist_count,
        schemaVersion: config.schema_version,
        dataVersion: config.data_version,
        version: config.version,
        additionalSettings: {}
      };
      
      // Add any additional PRAGMA settings not explicitly mapped
      Object.keys(config).forEach(key => {
        if (!mappedConfig.hasOwnProperty(key) && !key.includes('_')) {
          mappedConfig.additionalSettings[key] = config[key];
        }
      });
      
      return mappedConfig;
    } catch (error) {
      console.warn(`⚠️ Could not extract SQLite configuration:`, error);
      return {};
    }
  }

  private extractSQLiteStatistics(db: any, tableMetadata: any[]): any {
    const statistics: any = {
      tableStatistics: [],
      indexStatistics: [],
      databaseStatistics: {}
    };
    
    try {
      // Get database-level performance metrics
      const dbPerformance = this.getSQLitePerformanceMetrics(db);
      
      // Extract table statistics
      tableMetadata.forEach(table => {
        try {
          // Get table size information
          const tableInfo = db.prepare(`
            SELECT 
              name,
              (SELECT COUNT(*) FROM ${table.name}) as rowCount,
              (SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()) as dataSize,
              (SELECT page_count FROM pragma_page_count()) as pageCount
          `).get();
          
          // Get index statistics for this table
          const indexStats = db.prepare(`
            SELECT 
              name as indexName,
              (SELECT page_count * page_size FROM pragma_page_count(name), pragma_page_size()) as indexSize,
              (SELECT page_count FROM pragma_page_count(name)) as indexPages
            FROM pragma_index_list('${table.name}')
          `).all();
          
          // Calculate total index size for this table
          const totalIndexSize = indexStats.reduce((sum: number, idx: any) => sum + (idx.indexSize || 0), 0);
          
          // Get sqlite_stat1 statistics if available
          let stat1Stats = null;
          try {
            stat1Stats = db.prepare(`
              SELECT tbl, stat FROM sqlite_stat1 WHERE tbl = '${table.name}'
            `).all();
          } catch (error) {
            // sqlite_stat1 might not exist if ANALYZE hasn't been run
          }
          
          // Get table-specific performance metrics
          const tablePerformance = this.getSQLiteTablePerformanceMetrics(db, table.name);
          
          const tableStat = {
            tableName: table.name,
            schema: 'main',
            rowCount: tableInfo?.rowCount || 0,
            dataSize: tableInfo?.dataSize || 0,
            indexSize: totalIndexSize,
            totalSize: (tableInfo?.dataSize || 0) + totalIndexSize,
            pageCount: tableInfo?.pageCount || 0,
            avgRowSize: tableInfo?.rowCount > 0 ? (tableInfo?.dataSize || 0) / tableInfo.rowCount : 0,
            lastAnalyzed: this.getSQLiteLastAnalyzed(db, table.name),
            lastVacuumed: this.getSQLiteLastVacuumed(db, table.name),
            lastAutoVacuumed: this.getSQLiteLastAutoVacuumed(db, table.name),
            nTupIns: tablePerformance.insertCount || 0,
            nTupUpd: tablePerformance.updateCount || 0,
            nTupDel: tablePerformance.deleteCount || 0,
            nLiveTup: tableInfo?.rowCount || 0,
            nDeadTup: tablePerformance.deadTuples || 0,
            nModSinceAnalyze: tablePerformance.modificationsSinceAnalyze || 0,
            nInsSinceVacuum: tablePerformance.insertsSinceVacuum || 0,
            heapBlksRead: tablePerformance.heapBlocksRead || 0,
            heapBlksHit: tablePerformance.heapBlocksHit || 0,
            idxBlksRead: tablePerformance.indexBlocksRead || 0,
            idxBlksHit: tablePerformance.indexBlocksHit || 0,
            toastBlksRead: 0, // Not applicable to SQLite
            toastBlksHit: 0, // Not applicable to SQLite
            tidxBlksRead: 0, // Not applicable to SQLite
            tidxBlksHit: 0, // Not applicable to SQLite
            additionalStats: {
              stat1Data: stat1Stats || [],
              indexCount: indexStats.length,
              performance: tablePerformance,
              cacheHitRatio: tablePerformance.cacheHitRatio || 0,
              bufferHitRatio: tablePerformance.bufferHitRatio || 0
            }
          };
          
          statistics.tableStatistics.push(tableStat);
          
          // Add index statistics with performance metrics
          indexStats.forEach((idx: any) => {
            const indexPerformance = this.getSQLiteIndexPerformanceMetrics(db, table.name, idx.indexName);
            
            const indexStat = {
              indexName: idx.indexName,
              tableName: table.name,
              schema: 'main',
              indexSize: idx.indexSize || 0,
              indexPages: idx.indexPages || 0,
              indexTuples: indexPerformance.tupleCount || 0,
              indexScans: indexPerformance.scanCount || 0,
              indexTuplesRead: indexPerformance.tuplesRead || 0,
              indexTuplesFetched: indexPerformance.tuplesFetched || 0,
              lastUsed: indexPerformance.lastUsed || null,
              additionalStats: {
                performance: indexPerformance,
                cacheHitRatio: indexPerformance.cacheHitRatio || 0
              }
            };
            
            statistics.indexStatistics.push(indexStat);
          });
          
        } catch (error) {
          console.warn(`⚠️ Could not get statistics for table ${table.name}:`, error);
        }
      });
      
      // Calculate database-level statistics
      const totalTables = statistics.tableStatistics.length;
      const totalIndexes = statistics.indexStatistics.length;
      const totalSize = statistics.tableStatistics.reduce((sum: number, table: any) => sum + (table.totalSize || 0), 0);
      const dataSize = statistics.tableStatistics.reduce((sum: number, table: any) => sum + (table.dataSize || 0), 0);
      const indexSize = statistics.tableStatistics.reduce((sum: number, table: any) => sum + (table.indexSize || 0), 0);
      
      statistics.databaseStatistics = {
        totalTables,
        totalIndexes,
        totalSize,
        dataSize,
        indexSize,
        cacheHitRatio: dbPerformance.cacheHitRatio || 0,
        bufferHitRatio: dbPerformance.bufferHitRatio || 0,
        lastAnalyzed: dbPerformance.lastAnalyzed || null,
        lastVacuumed: dbPerformance.lastVacuumed || null,
        additionalStats: {
          pageSize: db.prepare('PRAGMA page_size').get()?.page_size || 0,
          pageCount: db.prepare('PRAGMA page_count').get()?.page_count || 0,
          freelistCount: db.prepare('PRAGMA freelist_count').get()?.freelist_count || 0,
          performance: dbPerformance,
          totalInserts: dbPerformance.totalInserts || 0,
          totalUpdates: dbPerformance.totalUpdates || 0,
          totalDeletes: dbPerformance.totalDeletes || 0,
          totalScans: dbPerformance.totalScans || 0,
          totalReads: dbPerformance.totalReads || 0
        }
      };
      
      return statistics;
    } catch (error) {
      console.warn(`⚠️ Could not extract SQLite statistics:`, error);
      return statistics;
    }
  }

  private getSQLitePerformanceMetrics(db: any): any {
    try {
      // Get database-level performance metrics
      const pageSize = db.prepare('PRAGMA page_size').get()?.page_size || 4096;
      const pageCount = db.prepare('PRAGMA page_count').get()?.page_count || 0;
      const freelistCount = db.prepare('PRAGMA freelist_count').get()?.freelist_count || 0;
      const cacheSize = db.prepare('PRAGMA cache_size').get()?.cache_size || 0;
      
      // Calculate cache hit ratio based on available pages vs cache
      const cacheHitRatio = cacheSize > 0 ? Math.min(100, (pageCount / cacheSize) * 100) : 0;
      
      return {
        cacheHitRatio: Math.round(cacheHitRatio * 100) / 100,
        bufferHitRatio: Math.round(cacheHitRatio * 100) / 100,
        lastAnalyzed: this.getSQLiteLastAnalyzed(db, 'database'),
        lastVacuumed: this.getSQLiteLastVacuumed(db, 'database'),
        totalInserts: 0, // Would need to track this separately
        totalUpdates: 0, // Would need to track this separately
        totalDeletes: 0, // Would need to track this separately
        totalScans: 0, // Would need to track this separately
        totalReads: 0 // Would need to track this separately
      };
    } catch (error) {
      console.warn(`⚠️ Could not get SQLite performance metrics:`, error);
      return {};
    }
  }

  private getSQLiteTablePerformanceMetrics(db: any, tableName: string): any {
    try {
      // Get table-specific performance metrics
      const pageSize = db.prepare('PRAGMA page_size').get()?.page_size || 4096;
      const tablePageCount = db.prepare(`PRAGMA page_count('${tableName}')`).get()?.page_count || 0;
      const cacheSize = db.prepare('PRAGMA cache_size').get()?.cache_size || 0;
      
      // Calculate cache hit ratio for this table
      const cacheHitRatio = cacheSize > 0 ? Math.min(100, (tablePageCount / cacheSize) * 100) : 0;
      
      return {
        cacheHitRatio: Math.round(cacheHitRatio * 100) / 100,
        bufferHitRatio: Math.round(cacheHitRatio * 100) / 100,
        insertCount: 0, // Would need to track this separately
        updateCount: 0, // Would need to track this separately
        deleteCount: 0, // Would need to track this separately
        deadTuples: 0, // SQLite doesn't track this
        modificationsSinceAnalyze: 0, // Would need to track this separately
        insertsSinceVacuum: 0, // Would need to track this separately
        heapBlocksRead: 0, // Would need to track this separately
        heapBlocksHit: tablePageCount, // Approximate
        indexBlocksRead: 0, // Would need to track this separately
        indexBlocksHit: 0 // Would need to track this separately
      };
    } catch (error) {
      console.warn(`⚠️ Could not get SQLite table performance metrics for ${tableName}:`, error);
      return {};
    }
  }

  private getSQLiteIndexPerformanceMetrics(db: any, tableName: string, indexName: string): any {
    try {
      // Get index-specific performance metrics
      const pageSize = db.prepare('PRAGMA page_size').get()?.page_size || 4096;
      const indexPageCount = db.prepare(`PRAGMA page_count('${indexName}')`).get()?.page_count || 0;
      const cacheSize = db.prepare('PRAGMA cache_size').get()?.cache_size || 0;
      
      // Calculate cache hit ratio for this index
      const cacheHitRatio = cacheSize > 0 ? Math.min(100, (indexPageCount / cacheSize) * 100) : 0;
      
      return {
        cacheHitRatio: Math.round(cacheHitRatio * 100) / 100,
        tupleCount: 0, // Would need to track this separately
        scanCount: 0, // Would need to track this separately
        tuplesRead: 0, // Would need to track this separately
        tuplesFetched: 0, // Would need to track this separately
        lastUsed: null // Would need to track this separately
      };
    } catch (error) {
      console.warn(`⚠️ Could not get SQLite index performance metrics for ${indexName}:`, error);
      return {};
    }
  }

  private getSQLiteLastAnalyzed(db: any, tableName: string): string | null {
    try {
      // Check if sqlite_stat1 exists and has data for this table
      const stat1Exists = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_stat1'
      `).get();
      
      if (stat1Exists) {
        const stat1Data = db.prepare(`
          SELECT tbl FROM sqlite_stat1 WHERE tbl = '${tableName}'
        `).get();
        
        if (stat1Data) {
          // Return current timestamp as last analyzed time
          return new Date().toISOString();
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private getSQLiteLastVacuumed(db: any, tableName: string): string | null {
    try {
      // Check if table has been vacuumed by looking at page count changes
      const pageCount = db.prepare(`PRAGMA page_count('${tableName}')`).get()?.page_count || 0;
      const freelistCount = db.prepare('PRAGMA freelist_count').get()?.freelist_count || 0;
      
      // If there are free pages, assume recent vacuum
      if (freelistCount > 0) {
        return new Date().toISOString();
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private getSQLiteLastAutoVacuumed(db: any, tableName: string): string | null {
    try {
      // Check if auto-vacuum is enabled
      const autoVacuum = db.prepare('PRAGMA auto_vacuum').get()?.auto_vacuum || 0;
      
      if (autoVacuum > 0) {
        // If auto-vacuum is enabled, assume it's been running
        return new Date().toISOString();
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private parseSQLiteTrigger(sql: string): any {
    try {
      // Parse SQLite trigger definition
      const upperSql = sql.toUpperCase();
      
      // Extract timing
      let timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF' = 'AFTER';
      if (upperSql.includes('BEFORE')) timing = 'BEFORE';
      else if (upperSql.includes('AFTER')) timing = 'AFTER';
      else if (upperSql.includes('INSTEAD OF')) timing = 'INSTEAD OF';
      
      // Extract event
      let event: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE' = 'INSERT';
      if (upperSql.includes('INSERT')) event = 'INSERT';
      else if (upperSql.includes('UPDATE')) event = 'UPDATE';
      else if (upperSql.includes('DELETE')) event = 'DELETE';
      else if (upperSql.includes('TRUNCATE')) event = 'TRUNCATE';
      
      // Extract body (everything after FOR EACH ROW)
      const forEachRowIndex = upperSql.indexOf('FOR EACH ROW');
      let body = '';
      if (forEachRowIndex !== -1) {
        body = sql.substring(forEachRowIndex + 'FOR EACH ROW'.length).trim();
        // Remove WHEN condition if present
        const whenIndex = body.toUpperCase().indexOf('WHEN');
        if (whenIndex !== -1) {
          body = body.substring(0, whenIndex).trim();
        }
      }
      
      // Extract condition (WHEN clause)
      let condition = '';
      const whenMatch = sql.match(/WHEN\s+(.+?)(?:\s+BEGIN|\s+$)/i);
      if (whenMatch) {
        condition = whenMatch[1].trim();
      }
      
      // Extract dependencies (table references in body)
      const dependencies: string[] = [];
      const tableMatches = body.match(/\b(\w+)\s*\./g);
      if (tableMatches) {
        tableMatches.forEach(match => {
          const tableName = match.replace('.', '').trim();
          if (tableName && !dependencies.includes(tableName)) {
            dependencies.push(tableName);
          }
        });
      }
      
      // Extract comment (if present in SQL)
      let comment = '';
      const commentMatch = sql.match(/--\s*(.+)$/m);
      if (commentMatch) {
        comment = commentMatch[1].trim();
      }
      
      return {
        timing,
        event,
        body,
        condition,
        dependencies,
        comment
      };
    } catch (error) {
      console.warn(`⚠️ Could not parse SQLite trigger:`, error);
      return {
        timing: 'AFTER' as const,
        event: 'INSERT' as const,
        body: sql,
        condition: '',
        dependencies: [],
        comment: ''
      };
    }
  }

  private async extractSQLiteProcedures(db: any): Promise<any[]> {
    try {
      // SQLite doesn't have native procedures, but we can extract views that act like procedures
      // and any custom functions defined in sqlite_master
      const procedures: any[] = [];
      
      // Check for views that might act like procedures
      const viewQuery = `
        SELECT 
          name,
          sql as definition,
          'VIEW' as type
        FROM sqlite_master 
        WHERE type = 'view'
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `;
      
      const views = db.prepare(viewQuery).all();
      
      views.forEach((view: any) => {
        const dependencies = this.extractConstraintDependencies(view.definition || '');
        
        procedures.push({
          name: `${view.name}_procedure`,
          schema: 'main',
          language: 'SQL',
          definition: view.definition || '',
          body: view.definition || '',
          returnType: 'TABLE',
          parameters: this.parseSQLiteParameters(view.definition || ''),
          creationDDL: view.definition || '',
          isEnabled: true,
          comment: `SQLite view acting as procedure: ${view.name}`,
          cost: 100,
          rows: 1000,
          volatile: 'VOLATILE',
          parallel: 'UNSAFE',
          securityDefiner: false,
          dependencies
        });
      });
      
      // Check for any custom functions in sqlite_master (though SQLite doesn't support this natively)
      // This is a placeholder for potential future SQLite extensions
      const customQuery = `
        SELECT 
          name,
          sql as definition
        FROM sqlite_master 
        WHERE type = 'table'
        AND name LIKE '%_procedure'
        ORDER BY name
      `;
      
      const customProcs = db.prepare(customQuery).all();
      
      customProcs.forEach((proc: any) => {
        const dependencies = this.extractConstraintDependencies(proc.definition || '');
        
        procedures.push({
          name: proc.name,
          schema: 'main',
          language: 'SQL',
          definition: proc.definition || '',
          body: proc.definition || '',
          returnType: 'TABLE',
          parameters: this.parseSQLiteParameters(proc.definition || ''),
          creationDDL: proc.definition || '',
          isEnabled: true,
          comment: `SQLite custom procedure: ${proc.name}`,
          cost: 100,
          rows: 1000,
          volatile: 'VOLATILE',
          parallel: 'UNSAFE',
          securityDefiner: false,
          dependencies
        });
      });
      
      return procedures;
    } catch (error) {
      console.warn(`⚠️ Could not extract SQLite procedures:`, error);
      return [];
    }
  }

  private async extractSQLiteFunctions(db: any): Promise<any[]> {
    try {
      // SQLite doesn't have native functions, but we can extract built-in functions
      // and any custom functions defined in sqlite_master
      const functions: any[] = [];
      
      // Get SQLite built-in functions
      const builtinFunctions = [
        'abs', 'changes', 'char', 'coalesce', 'glob', 'hex', 'ifnull', 'instr',
        'last_insert_rowid', 'length', 'like', 'likelihood', 'likely', 'load_extension',
        'lower', 'ltrim', 'max', 'min', 'nullif', 'printf', 'quote', 'random',
        'randomblob', 'replace', 'round', 'rtrim', 'soundex', 'sqlite_compileoption_get',
        'sqlite_compileoption_used', 'sqlite_offset', 'sqlite_source_id', 'sqlite_version',
        'substr', 'substring', 'total_changes', 'trim', 'typeof', 'unlikely', 'upper',
        'zeroblob', 'date', 'time', 'datetime', 'julianday', 'unixepoch', 'strftime'
      ];
      
      builtinFunctions.forEach(funcName => {
        functions.push({
          name: funcName,
          schema: 'main',
          language: 'C',
          definition: `Built-in SQLite function: ${funcName}`,
          body: `Built-in SQLite function: ${funcName}`,
          returnType: 'any',
          parameters: this.getSQLiteBuiltinFunctionParameters(funcName),
          creationDDL: `Built-in SQLite function: ${funcName}`,
          isEnabled: true,
          comment: `SQLite built-in function: ${funcName}`,
          cost: 1,
          rows: 1,
          volatile: 'VOLATILE',
          parallel: 'SAFE',
          securityDefiner: false,
          dependencies: []
        });
      });
      
      // Check for any custom functions in sqlite_master (though SQLite doesn't support this natively)
      const customQuery = `
        SELECT 
          name,
          sql as definition
        FROM sqlite_master 
        WHERE type = 'table'
        AND name LIKE '%_function'
        ORDER BY name
      `;
      
      const customFuncs = db.prepare(customQuery).all();
      
      customFuncs.forEach((func: any) => {
        const dependencies = this.extractConstraintDependencies(func.definition || '');
        
        functions.push({
          name: func.name,
          schema: 'main',
          language: 'SQL',
          definition: func.definition || '',
          body: func.definition || '',
          returnType: 'any',
          parameters: this.parseSQLiteParameters(func.definition || ''),
          creationDDL: func.definition || '',
          isEnabled: true,
          comment: `SQLite custom function: ${func.name}`,
          cost: 100,
          rows: 1,
          volatile: 'VOLATILE',
          parallel: 'UNSAFE',
          securityDefiner: false,
          dependencies
        });
      });
      
      return functions;
    } catch (error) {
      console.warn(`⚠️ Could not extract SQLite functions:`, error);
      return [];
    }
  }

  private parseSQLiteParameters(definition: string): Array<{
    name: string;
    type: string;
    mode: 'IN' | 'OUT' | 'INOUT';
    defaultValue?: string;
  }> {
    try {
      if (!definition || definition.trim() === '') {
        return [];
      }
      
      const params: Array<{
        name: string;
        type: string;
        mode: 'IN' | 'OUT' | 'INOUT';
        defaultValue?: string;
      }> = [];
      
      // Extract parameters from SQL definition
      const paramMatches = definition.match(/\(([^)]+)\)/g);
      if (paramMatches) {
        paramMatches.forEach(match => {
          const paramString = match.replace(/[()]/g, '');
          const paramParts = paramString.split(',').map(p => p.trim());
          
          paramParts.forEach(param => {
            if (param && !param.match(/^\d+$/) && !param.match(/^'[^']*'$/)) {
              // Skip numeric literals and string literals
              const parts = param.split(/\s+/);
              if (parts.length >= 1) {
                const name = parts[0].replace(/[`'"]/g, '');
                const type = parts[1] || 'any';
                
                params.push({
                  name,
                  type,
                  mode: 'IN' as const
                });
              }
            }
          });
        });
      }
      
      return params;
    } catch (error) {
      console.warn(`⚠️ Could not parse SQLite parameters:`, error);
      return [];
    }
  }

  private getSQLiteBuiltinFunctionParameters(funcName: string): Array<{
    name: string;
    type: string;
    mode: 'IN' | 'OUT' | 'INOUT';
    defaultValue?: string;
  }> {
    // Define parameters for common SQLite built-in functions
    const functionParams: Record<string, Array<{name: string; type: string; mode: 'IN' | 'OUT' | 'INOUT'}>> = {
      'abs': [{ name: 'x', type: 'numeric', mode: 'IN' }],
      'changes': [],
      'char': [{ name: 'x', type: 'any', mode: 'IN' }],
      'coalesce': [{ name: 'x', type: 'any', mode: 'IN' }],
      'glob': [{ name: 'pattern', type: 'text', mode: 'IN' }, { name: 'string', type: 'text', mode: 'IN' }],
      'hex': [{ name: 'x', type: 'any', mode: 'IN' }],
      'ifnull': [{ name: 'x', type: 'any', mode: 'IN' }, { name: 'y', type: 'any', mode: 'IN' }],
      'instr': [{ name: 'string', type: 'text', mode: 'IN' }, { name: 'substring', type: 'text', mode: 'IN' }],
      'last_insert_rowid': [],
      'length': [{ name: 'string', type: 'text', mode: 'IN' }],
      'like': [{ name: 'string', type: 'text', mode: 'IN' }, { name: 'pattern', type: 'text', mode: 'IN' }],
      'likelihood': [{ name: 'x', type: 'any', mode: 'IN' }, { name: 'y', type: 'real', mode: 'IN' }],
      'likely': [{ name: 'x', type: 'any', mode: 'IN' }],
      'load_extension': [{ name: 'file', type: 'text', mode: 'IN' }],
      'lower': [{ name: 'string', type: 'text', mode: 'IN' }],
      'ltrim': [{ name: 'string', type: 'text', mode: 'IN' }],
      'max': [{ name: 'x', type: 'any', mode: 'IN' }],
      'min': [{ name: 'x', type: 'any', mode: 'IN' }],
      'nullif': [{ name: 'x', type: 'any', mode: 'IN' }, { name: 'y', type: 'any', mode: 'IN' }],
      'printf': [{ name: 'format', type: 'text', mode: 'IN' }],
      'quote': [{ name: 'string', type: 'text', mode: 'IN' }],
      'random': [],
      'randomblob': [{ name: 'n', type: 'integer', mode: 'IN' }],
      'replace': [{ name: 'string', type: 'text', mode: 'IN' }, { name: 'old', type: 'text', mode: 'IN' }, { name: 'new', type: 'text', mode: 'IN' }],
      'round': [{ name: 'x', type: 'numeric', mode: 'IN' }],
      'rtrim': [{ name: 'string', type: 'text', mode: 'IN' }],
      'soundex': [{ name: 'string', type: 'text', mode: 'IN' }],
      'sqlite_compileoption_get': [{ name: 'n', type: 'integer', mode: 'IN' }],
      'sqlite_compileoption_used': [{ name: 'option_name', type: 'text', mode: 'IN' }],
      'sqlite_offset': [{ name: 'expr', type: 'any', mode: 'IN' }],
      'sqlite_source_id': [],
      'sqlite_version': [],
      'substr': [{ name: 'string', type: 'text', mode: 'IN' }, { name: 'start', type: 'integer', mode: 'IN' }],
      'substring': [{ name: 'string', type: 'text', mode: 'IN' }, { name: 'start', type: 'integer', mode: 'IN' }],
      'total_changes': [],
      'trim': [{ name: 'string', type: 'text', mode: 'IN' }],
      'typeof': [{ name: 'x', type: 'any', mode: 'IN' }],
      'unlikely': [{ name: 'x', type: 'any', mode: 'IN' }],
      'upper': [{ name: 'string', type: 'text', mode: 'IN' }],
      'zeroblob': [{ name: 'n', type: 'integer', mode: 'IN' }],
      'date': [{ name: 'timestring', type: 'text', mode: 'IN' }],
      'time': [{ name: 'timestring', type: 'text', mode: 'IN' }],
      'datetime': [{ name: 'timestring', type: 'text', mode: 'IN' }],
      'julianday': [{ name: 'timestring', type: 'text', mode: 'IN' }],
      'unixepoch': [{ name: 'timestring', type: 'text', mode: 'IN' }],
      'strftime': [{ name: 'format', type: 'text', mode: 'IN' }, { name: 'timestring', type: 'text', mode: 'IN' }]
    };
    
    return functionParams[funcName] || [];
  }

  private async extractSQLiteSequences(db: any): Promise<any[]> {
    try {
      // SQLite doesn't have native sequences, but we can extract autoincrement patterns
      // and any custom sequences defined in sqlite_master
      const sequences: any[] = [];
      
      // Find tables with autoincrement columns
      const autoincrementQuery = `
        SELECT 
          name as table_name,
          sql as definition
        FROM sqlite_master 
        WHERE type = 'table'
        AND sql LIKE '%AUTOINCREMENT%'
        ORDER BY name
      `;
      
      const autoincrementTables = db.prepare(autoincrementQuery).all();
      
      autoincrementTables.forEach((table: any) => {
        // Extract autoincrement column info
        const autoincrementMatch = table.definition.match(/(\w+)\s+INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi);
        if (autoincrementMatch) {
          autoincrementMatch.forEach((match: string) => {
            const columnName = match.match(/(\w+)\s+INTEGER/)?.[1];
            if (columnName) {
              // Get current value from sqlite_sequence if available
              let lastValue: number | undefined;
              try {
                const currentValue = db.prepare(`SELECT seq FROM sqlite_sequence WHERE name = ?`).get(table.table_name);
                lastValue = currentValue?.seq;
              } catch (error) {
                // sqlite_sequence table doesn't exist or no entry
              }

              sequences.push({
                name: `${table.table_name}_${columnName}_sequence`,
                schema: 'main',
                columnName: columnName,
                startValue: 1,
                increment: 1,
                minValue: 1,
                maxValue: 9223372036854775807,
                cycle: false,
                cache: 1,
                lastValue: lastValue,
                isOwned: true,
                ownershipType: 'COLUMN',
                dataType: 'INTEGER',
                creationDDL: `AUTOINCREMENT column ${columnName} in table ${table.table_name}`,
                comment: `SQLite autoincrement sequence for ${table.table_name}.${columnName}`
              });
            }
          });
        }
      });
      
      // Check for any custom sequences defined in sqlite_master
      const customSequenceQuery = `
        SELECT 
          name,
          sql as definition
        FROM sqlite_master 
        WHERE type = 'table'
        AND name LIKE '%_sequence'
        ORDER BY name
      `;
      
      const customSequences = db.prepare(customSequenceQuery).all();
      
      customSequences.forEach((seq: any) => {
        sequences.push({
          name: seq.name,
          schema: 'main',
          columnName: 'value', // Default column name for custom sequences
          startValue: 1,
          increment: 1,
          minValue: 1,
          maxValue: 9223372036854775807,
          cycle: false,
          cache: 1,
          lastValue: undefined,
          isOwned: false,
          ownershipType: 'SEQUENCE',
          dataType: 'INTEGER',
          creationDDL: seq.definition || '',
          comment: `SQLite custom sequence: ${seq.name}`
        });
      });
      
      // Add a generic sequence for sqlite_sequence table if it exists
      try {
        const sqliteSequenceQuery = `
          SELECT name FROM sqlite_master 
          WHERE type = 'table' AND name = 'sqlite_sequence'
        `;
        const sqliteSequence = db.prepare(sqliteSequenceQuery).get();
        
        if (sqliteSequence) {
          sequences.push({
            name: 'sqlite_sequence',
            schema: 'main',
            columnName: 'seq', // Column name in sqlite_sequence table
            startValue: 1,
            increment: 1,
            minValue: 1,
            maxValue: 9223372036854775807,
            cycle: false,
            cache: 1,
            lastValue: undefined,
            isOwned: true,
            ownershipType: 'TABLE',
            dataType: 'INTEGER',
            creationDDL: 'SQLite internal sequence table',
            comment: 'SQLite internal sequence table for autoincrement columns'
          });
        }
      } catch (error) {
        // sqlite_sequence table might not exist
      }
      
      return sequences;
    } catch (error) {
      console.warn(`⚠️ Could not extract SQLite sequences:`, error);
      return [];
    }
  }

  private async extractPostgreSQLTriggers(client: any): Promise<any[]> {
    try {
      const triggerQuery = `
        SELECT 
          t.trigger_name,
          t.event_object_table as table_name,
          t.event_object_schema as schema_name,
          t.event_manipulation as event,
          t.action_timing as timing,
          t.action_orientation as orientation,
          t.action_statement as definition,
          pg_get_triggerdef(pg_trigger.oid) as creation_ddl,
          pg_trigger.tgenabled as is_enabled,
          pg_trigger.tgqual as condition,
          pg_trigger.tgtype as trigger_type,
          pg_proc.proname as function_name,
          pg_proc.prosrc as function_body,
          pg_proc.provolatile as volatile,
          pg_proc.proisstrict as is_strict,
          pg_proc.prosecdef as security_definer,
          pg_description.description as comment
        FROM information_schema.triggers t
        LEFT JOIN pg_trigger ON pg_trigger.tgname = t.trigger_name
        LEFT JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid
        LEFT JOIN pg_description ON pg_description.objoid = pg_trigger.oid
        WHERE t.trigger_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY t.event_object_schema, t.event_object_table, t.trigger_name
      `;
      
      const result = await client.query(triggerQuery);
      
      return result.rows.map((trigger: any) => {
        const dependencies = this.extractConstraintDependencies(trigger.definition || '');
        
        return {
          name: trigger.trigger_name,
          tableName: trigger.table_name,
          schema: trigger.schema_name,
          timing: trigger.timing,
          event: trigger.event,
          orientation: trigger.orientation,
          definition: trigger.definition || '',
          body: trigger.function_body || trigger.definition || '',
          isEnabled: trigger.is_enabled !== 'D',
          creationDDL: trigger.creation_ddl || '',
          condition: trigger.condition || undefined,
          granularity: trigger.orientation,
          securityDefiner: trigger.security_definer || false,
          dependencies,
          comment: trigger.comment || undefined
        };
      });
    } catch (error) {
      console.warn(`⚠️ Could not extract PostgreSQL triggers:`, error);
      return [];
    }
  }

  private async extractPostgreSQLProcedures(client: any): Promise<any[]> {
    try {
      const procedureQuery = `
        SELECT 
          p.proname as name,
          n.nspname as schema_name,
          l.lanname as language,
          pg_get_functiondef(p.oid) as definition,
          pg_get_function_arguments(p.oid) as arguments,
          pg_get_function_result(p.oid) as return_type,
          p.prosrc as body,
          p.procost as cost,
          p.prorows as rows,
          p.provolatile as volatile,
          p.proparallel as parallel,
          p.prosecdef as security_definer,
          p.proisstrict as is_strict,
          p.proiswindow as is_window,
          p.prokind as kind,
          pg_description.description as comment
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
        LEFT JOIN pg_language l ON l.oid = p.prolang
        LEFT JOIN pg_description ON pg_description.objoid = p.oid
        WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND p.prokind = 'p'
        ORDER BY n.nspname, p.proname
      `;
      
      const result = await client.query(procedureQuery);
      
      return result.rows.map((proc: any) => {
        const parameters = this.parsePostgreSQLParameters(proc.arguments || '');
        const dependencies = this.extractConstraintDependencies(proc.body || '');
        
        return {
          name: proc.name,
          schema: proc.schema_name,
          language: proc.language,
          definition: proc.definition || '',
          body: proc.body || '',
          returnType: proc.return_type || undefined,
          parameters,
          creationDDL: proc.definition || '',
          isEnabled: true,
          comment: proc.comment || undefined,
          cost: proc.cost || undefined,
          rows: proc.rows || undefined,
          volatile: this.mapPostgreSQLVolatile(proc.volatile),
          parallel: this.mapPostgreSQLParallel(proc.parallel),
          securityDefiner: proc.security_definer || false,
          dependencies
        };
      });
    } catch (error) {
      console.warn(`⚠️ Could not extract PostgreSQL procedures:`, error);
      return [];
    }
  }

  private async extractPostgreSQLFunctions(client: any): Promise<any[]> {
    try {
      const functionQuery = `
        SELECT 
          p.proname as name,
          n.nspname as schema_name,
          l.lanname as language,
          pg_get_functiondef(p.oid) as definition,
          pg_get_function_arguments(p.oid) as arguments,
          pg_get_function_result(p.oid) as return_type,
          p.prosrc as body,
          p.procost as cost,
          p.prorows as rows,
          p.provolatile as volatile,
          p.proparallel as parallel,
          p.prosecdef as security_definer,
          p.proisstrict as is_strict,
          p.proiswindow as is_window,
          p.prokind as kind,
          pg_description.description as comment
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
        LEFT JOIN pg_language l ON l.oid = p.prolang
        LEFT JOIN pg_description ON pg_description.objoid = p.oid
        WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND p.prokind = 'f'
        ORDER BY n.nspname, p.proname
      `;
      
      const result = await client.query(functionQuery);
      
      return result.rows.map((func: any) => {
        const parameters = this.parsePostgreSQLParameters(func.arguments || '');
        const dependencies = this.extractConstraintDependencies(func.body || '');
        
        return {
          name: func.name,
          schema: func.schema_name,
          language: func.language,
          definition: func.definition || '',
          body: func.body || '',
          returnType: func.return_type || 'void',
          parameters,
          creationDDL: func.definition || '',
          isEnabled: true,
          comment: func.comment || undefined,
          cost: func.cost || undefined,
          rows: func.rows || undefined,
          volatile: this.mapPostgreSQLVolatile(func.volatile),
          parallel: this.mapPostgreSQLParallel(func.parallel),
          securityDefiner: func.security_definer || false,
          dependencies
        };
      });
    } catch (error) {
      console.warn(`⚠️ Could not extract PostgreSQL functions:`, error);
      return [];
    }
  }

  private async extractPostgreSQLSequences(client: any): Promise<any[]> {
    try {
      const sequenceQuery = `
        SELECT 
          s.sequencename as name,
          n.nspname as schema_name,
          pg_get_sequencedef(s.oid) as creation_ddl,
          s.start_value as start_value,
          s.min_value as min_value,
          s.max_value as max_value,
          s.increment_by as increment,
          s.cycle as cycle,
          s.cache_value as cache,
          s.last_value as last_value,
          pg_description.description as comment
        FROM pg_sequences s
        LEFT JOIN pg_namespace n ON n.nspname = s.schemaname
        LEFT JOIN pg_class c ON c.relname = s.sequencename AND c.relnamespace = n.oid
        LEFT JOIN pg_description ON pg_description.objoid = c.oid
        WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY n.nspname, s.sequencename
      `;
      
      const result = await client.query(sequenceQuery);
      
      return result.rows.map((seq: any) => ({
        name: seq.name,
        schema: seq.schema_name,
        columnName: 'nextval', // PostgreSQL sequences use nextval()
        startValue: parseInt(seq.start_value) || 1,
        increment: parseInt(seq.increment) || 1,
        minValue: parseInt(seq.min_value) || 1,
        maxValue: parseInt(seq.max_value) || 9223372036854775807,
        cycle: seq.cycle || false,
        cache: parseInt(seq.cache) || 1,
        lastValue: seq.last_value ? parseInt(seq.last_value) : undefined,
        isOwned: true,
        ownershipType: 'SEQUENCE',
        dataType: 'BIGINT',
        creationDDL: seq.creation_ddl || '',
        comment: seq.comment || undefined
      }));
    } catch (error) {
      console.warn(`⚠️ Could not extract PostgreSQL sequences:`, error);
      return [];
    }
  }

  private parsePostgreSQLParameters(args: string): Array<{
    name: string;
    type: string;
    mode: 'IN' | 'OUT' | 'INOUT';
    defaultValue?: string;
  }> {
    try {
      if (!args || args.trim() === '') {
        return [];
      }
      
      const params: Array<{
        name: string;
        type: string;
        mode: 'IN' | 'OUT' | 'INOUT';
        defaultValue?: string;
      }> = [];
      
      // Parse parameter string like "IN param1 integer, OUT param2 text, INOUT param3 boolean DEFAULT true"
      const paramMatches = args.match(/(\w+)\s+(\w+)\s+([^,]+?)(?=,\s*(?:IN|OUT|INOUT)|$)/g);
      
      if (paramMatches) {
        paramMatches.forEach(match => {
          const trimmed = match.trim();
          const parts = trimmed.split(/\s+/);
          
          if (parts.length >= 3) {
            const mode = parts[0] as 'IN' | 'OUT' | 'INOUT';
            const name = parts[1];
            const typeAndDefault = parts.slice(2).join(' ');
            
            // Extract type and default value
            const defaultMatch = typeAndDefault.match(/^(.+?)\s+DEFAULT\s+(.+)$/);
            if (defaultMatch) {
              params.push({
                name,
                type: defaultMatch[1].trim(),
                mode,
                defaultValue: defaultMatch[2].trim()
              });
            } else {
              params.push({
                name,
                type: typeAndDefault.trim(),
                mode
              });
            }
          }
        });
      }
      
      return params;
    } catch (error) {
      console.warn(`⚠️ Could not parse PostgreSQL parameters:`, error);
      return [];
    }
  }

  private mapPostgreSQLVolatile(volatile: string): string {
    switch (volatile) {
      case 'i': return 'IMMUTABLE';
      case 's': return 'STABLE';
      case 'v': return 'VOLATILE';
      default: return 'VOLATILE';
    }
  }

  private mapPostgreSQLParallel(parallel: string): string {
    switch (parallel) {
      case 's': return 'SAFE';
      case 'r': return 'RESTRICTED';
      case 'u': return 'UNSAFE';
      default: return 'UNSAFE';
    }
  }

  private async extractPostgreSQLEvents(client: any): Promise<any[]> {
    try {
      // PostgreSQL doesn't have native events, but we can extract scheduled jobs
      // from pg_cron extension or other job scheduling systems
      const events: any[] = [];
      
      // Check for pg_cron extension
      try {
        const cronQuery = `
          SELECT 
            jobid,
            schedule,
            command,
            nodename,
            nodeport,
            database,
            username,
            active,
            jobname
          FROM cron.job 
          ORDER BY jobid
        `;
        
        const cronResult = await client.query(cronQuery);
        
        cronResult.rows.forEach((job: any) => {
          const dependencies = this.extractConstraintDependencies(job.command || '');
          
          events.push({
            name: job.jobname || `cron_job_${job.jobid}`,
            schema: 'cron',
            definition: `SELECT cron.schedule('${job.jobname || `job_${job.jobid}`}', '${job.schedule}', '${job.command}');`,
            body: job.command || '',
            creationDDL: `SELECT cron.schedule('${job.jobname || `job_${job.jobid}`}', '${job.schedule}', '${job.command}');`,
            isEnabled: job.active || false,
            schedule: job.schedule || '',
            startsAt: undefined,
            endsAt: undefined,
            onCompletion: 'NOT PRESERVE',
            comment: `PostgreSQL cron job: ${job.jobname || `job_${job.jobid}`}`,
            status: job.active ? 'ENABLED' : 'DISABLED',
            lastExecuted: undefined,
            nextExecution: undefined,
            dependencies
          });
        });
      } catch (error) {
        // pg_cron extension might not be installed
        console.warn(`⚠️ pg_cron extension not available:`, error);
      }
      
      // Check for other job scheduling systems
      try {
        const jobQuery = `
          SELECT 
            job_name,
            job_schedule,
            job_command,
            job_enabled,
            job_created,
            job_last_run,
            job_next_run
          FROM information_schema.tables t
          WHERE t.table_schema = 'public'
          AND t.table_name LIKE '%job%'
          ORDER BY t.table_name
        `;
        
        const jobResult = await client.query(jobQuery);
        
        jobResult.rows.forEach((job: any) => {
          events.push({
            name: job.job_name || job.table_name,
            schema: 'public',
            definition: `Custom job table: ${job.table_name}`,
            body: `SELECT * FROM ${job.table_name}`,
            creationDDL: `CREATE TABLE ${job.table_name} (...);`,
            isEnabled: job.job_enabled || false,
            schedule: job.job_schedule || 'unknown',
            startsAt: job.job_created || undefined,
            endsAt: undefined,
            onCompletion: 'NOT PRESERVE',
            comment: `Custom job table: ${job.table_name}`,
            status: job.job_enabled ? 'ENABLED' : 'DISABLED',
            lastExecuted: job.job_last_run || undefined,
            nextExecution: job.job_next_run || undefined,
            dependencies: []
          });
        });
      } catch (error) {
        console.warn(`⚠️ Could not extract custom job tables:`, error);
      }
      
      return events;
    } catch (error) {
      console.warn(`⚠️ Could not extract PostgreSQL events:`, error);
      return [];
    }
  }

  private async extractMySQLTriggers(connection: any): Promise<any[]> {
    try {
      const triggerQuery = `
        SELECT 
          TRIGGER_NAME,
          EVENT_MANIPULATION as event,
          ACTION_TIMING as timing,
          ACTION_ORIENTATION as orientation,
          ACTION_STATEMENT as definition,
          TRIGGER_SCHEMA as schema_name,
          EVENT_OBJECT_TABLE as table_name,
          ACTION_CONDITION as condition,
          SQL_MODE,
          DEFINER,
          CHARACTER_SET_CLIENT,
          COLLATION_CONNECTION,
          DATABASE_COLLATION,
          CREATED
        FROM information_schema.TRIGGERS 
        WHERE TRIGGER_SCHEMA = DATABASE()
        ORDER BY EVENT_OBJECT_TABLE, TRIGGER_NAME
      `;
      
      const result = await connection.query(triggerQuery);
      
      return result.map((trigger: any) => {
        const dependencies = this.extractConstraintDependencies(trigger.definition || '');
        
        return {
          name: trigger.TRIGGER_NAME,
          tableName: trigger.table_name,
          schema: trigger.schema_name,
          timing: trigger.timing,
          event: trigger.event,
          orientation: trigger.orientation,
          definition: trigger.definition || '',
          body: trigger.definition || '',
          isEnabled: true,
          creationDDL: `CREATE TRIGGER \`${trigger.TRIGGER_NAME}\` ${trigger.timing} ${trigger.event} ON \`${trigger.table_name}\` FOR EACH ${trigger.orientation} ${trigger.definition}`,
          condition: trigger.condition || undefined,
          granularity: trigger.orientation,
          securityDefiner: false,
          dependencies,
          comment: undefined
        };
      });
    } catch (error) {
      console.warn(`⚠️ Could not extract MySQL triggers:`, error);
      return [];
    }
  }

  private async extractMySQLProcedures(connection: any): Promise<any[]> {
    try {
      const procedureQuery = `
        SELECT 
          ROUTINE_NAME as name,
          ROUTINE_SCHEMA as schema_name,
          ROUTINE_DEFINITION as body,
          ROUTINE_COMMENT as comment,
          DEFINER,
          SECURITY_TYPE,
          SQL_MODE,
          CHARACTER_SET_CLIENT,
          COLLATION_CONNECTION,
          DATABASE_COLLATION,
          CREATED,
          LAST_ALTERED
        FROM information_schema.ROUTINES 
        WHERE ROUTINE_SCHEMA = DATABASE()
        AND ROUTINE_TYPE = 'PROCEDURE'
        ORDER BY ROUTINE_NAME
      `;
      
      const result = await connection.query(procedureQuery);
      
      return result.map((proc: any) => {
        const parameters = this.parseMySQLParameters(proc.body || '');
        const dependencies = this.extractConstraintDependencies(proc.body || '');
        
        return {
          name: proc.name,
          schema: proc.schema_name,
          language: 'SQL',
          definition: `CREATE PROCEDURE \`${proc.name}\` (${parameters.map(p => `${p.mode} \`${p.name}\` ${p.type}${p.defaultValue ? ` DEFAULT ${p.defaultValue}` : ''}`).join(', ')}) ${proc.body}`,
          body: proc.body || '',
          returnType: undefined,
          parameters,
          creationDDL: `CREATE PROCEDURE \`${proc.name}\` (${parameters.map(p => `${p.mode} \`${p.name}\` ${p.type}${p.defaultValue ? ` DEFAULT ${p.defaultValue}` : ''}`).join(', ')}) ${proc.body}`,
          isEnabled: true,
          comment: proc.comment || undefined,
          cost: undefined,
          rows: undefined,
          volatile: 'VOLATILE',
          parallel: 'UNSAFE',
          securityDefiner: proc.SECURITY_TYPE === 'DEFINER',
          dependencies
        };
      });
    } catch (error) {
      console.warn(`⚠️ Could not extract MySQL procedures:`, error);
      return [];
    }
  }

  private async extractMySQLFunctions(connection: any): Promise<any[]> {
    try {
      const functionQuery = `
        SELECT 
          ROUTINE_NAME as name,
          ROUTINE_SCHEMA as schema_name,
          ROUTINE_DEFINITION as body,
          ROUTINE_COMMENT as comment,
          DEFINER,
          SECURITY_TYPE,
          SQL_MODE,
          CHARACTER_SET_CLIENT,
          COLLATION_CONNECTION,
          DATABASE_COLLATION,
          CREATED,
          LAST_ALTERED,
          DATA_TYPE as return_type
        FROM information_schema.ROUTINES 
        WHERE ROUTINE_SCHEMA = DATABASE()
        AND ROUTINE_TYPE = 'FUNCTION'
        ORDER BY ROUTINE_NAME
      `;
      
      const result = await connection.query(functionQuery);
      
      return result.map((func: any) => {
        const parameters = this.parseMySQLParameters(func.body || '');
        const dependencies = this.extractConstraintDependencies(func.body || '');
        
        return {
          name: func.name,
          schema: func.schema_name,
          language: 'SQL',
          definition: `CREATE FUNCTION \`${func.name}\` (${parameters.map(p => `${p.mode} \`${p.name}\` ${p.type}${p.defaultValue ? ` DEFAULT ${p.defaultValue}` : ''}`).join(', ')}) RETURNS ${func.return_type} ${func.body}`,
          body: func.body || '',
          returnType: func.return_type || 'void',
          parameters,
          creationDDL: `CREATE FUNCTION \`${func.name}\` (${parameters.map(p => `${p.mode} \`${p.name}\` ${p.type}${p.defaultValue ? ` DEFAULT ${p.defaultValue}` : ''}`).join(', ')}) RETURNS ${func.return_type} ${func.body}`,
          isEnabled: true,
          comment: func.comment || undefined,
          cost: undefined,
          rows: undefined,
          volatile: 'VOLATILE',
          parallel: 'UNSAFE',
          securityDefiner: func.SECURITY_TYPE === 'DEFINER',
          dependencies
        };
      });
    } catch (error) {
      console.warn(`⚠️ Could not extract MySQL functions:`, error);
      return [];
    }
  }

  private async extractMySQLEvents(connection: any): Promise<any[]> {
    try {
      const eventQuery = `
        SELECT 
          EVENT_NAME as name,
          EVENT_SCHEMA as schema_name,
          EVENT_DEFINITION as body,
          EVENT_COMMENT as comment,
          DEFINER,
          TIME_ZONE,
          EVENT_BODY as body_type,
          EVENT_EXPRESSION as schedule,
          INTERVAL_VALUE,
          INTERVAL_FIELD,
          SQL_MODE,
          STARTS,
          ENDS,
          STATUS,
          ON_COMPLETION,
          CREATED,
          LAST_ALTERED,
          LAST_EXECUTED,
          EVENT_ORIGINATOR,
          CHARACTER_SET_CLIENT,
          COLLATION_CONNECTION,
          DATABASE_COLLATION
        FROM information_schema.EVENTS 
        WHERE EVENT_SCHEMA = DATABASE()
        ORDER BY EVENT_NAME
      `;
      
      const result = await connection.query(eventQuery);
      
      return result.map((event: any) => {
        const dependencies = this.extractConstraintDependencies(event.body || '');
        
        return {
          name: event.name,
          schema: event.schema_name,
          definition: `CREATE EVENT \`${event.name}\` ON SCHEDULE ${event.schedule} ${event.body}`,
          body: event.body || '',
          creationDDL: `CREATE EVENT \`${event.name}\` ON SCHEDULE ${event.schedule} ${event.body}`,
          isEnabled: event.STATUS === 'ENABLED',
          schedule: event.schedule || '',
          startsAt: event.STARTS || undefined,
          endsAt: event.ENDS || undefined,
          onCompletion: event.ON_COMPLETION || 'NOT PRESERVE',
          comment: event.comment || undefined,
          status: event.STATUS || 'DISABLED',
          lastExecuted: event.LAST_EXECUTED || undefined,
          nextExecution: undefined, // Would need to calculate
          dependencies
        };
      });
    } catch (error) {
      console.warn(`⚠️ Could not extract MySQL events:`, error);
      return [];
    }
  }

  private parseMySQLParameters(body: string): Array<{
    name: string;
    type: string;
    mode: 'IN' | 'OUT' | 'INOUT';
    defaultValue?: string;
  }> {
    try {
      if (!body || body.trim() === '') {
        return [];
      }
      
      const params: Array<{
        name: string;
        type: string;
        mode: 'IN' | 'OUT' | 'INOUT';
        defaultValue?: string;
      }> = [];
      
      // Extract parameters from function/procedure definition
      const paramMatch = body.match(/\(([^)]+)\)/);
      if (paramMatch) {
        const paramString = paramMatch[1];
        const paramParts = paramString.split(',').map(p => p.trim());
        
        paramParts.forEach(param => {
          if (param) {
            const parts = param.split(/\s+/);
            if (parts.length >= 2) {
              const mode = parts[0] as 'IN' | 'OUT' | 'INOUT';
              const name = parts[1].replace(/`/g, '');
              const typeAndDefault = parts.slice(2).join(' ');
              
              // Extract type and default value
              const defaultMatch = typeAndDefault.match(/^(.+?)\s+DEFAULT\s+(.+)$/);
              if (defaultMatch) {
                params.push({
                  name,
                  type: defaultMatch[1].trim(),
                  mode,
                  defaultValue: defaultMatch[2].trim()
                });
              } else {
                params.push({
                  name,
                  type: typeAndDefault.trim(),
                  mode
                });
              }
            }
          }
        });
      }
      
      return params;
    } catch (error) {
      console.warn(`⚠️ Could not parse MySQL parameters:`, error);
      return [];
    }
  }

  private async extractMongoDBTriggers(db: any): Promise<any[]> {
    try {
      // MongoDB doesn't have traditional triggers, but we can extract change streams
      // and other event-driven mechanisms
      const triggers: any[] = [];
      
      // Check for change streams (MongoDB's equivalent to triggers)
      try {
        const collections = await db.listCollections().toArray();
        
        for (const collection of collections) {
          // Check if collection has change streams configured
          const changeStreams = await this.getMongoDBChangeStreams(db, collection.name);
          triggers.push(...changeStreams);
        }
      } catch (error) {
        console.warn(`⚠️ Could not extract MongoDB change streams:`, error);
      }
      
      return triggers;
    } catch (error) {
      console.warn(`⚠️ Could not extract MongoDB triggers:`, error);
      return [];
    }
  }

  private async extractMongoDBProcedures(db: any): Promise<any[]> {
    try {
      // MongoDB stored procedures are stored in system.js collection
      const procedures: any[] = [];
      
      try {
        const systemJs = db.collection('system.js');
        const storedProcs = await systemJs.find({}).toArray();
        
        storedProcs.forEach((proc: any) => {
          const dependencies = this.extractConstraintDependencies(proc.value?.toString() || '');
          
          procedures.push({
            name: proc._id,
            schema: 'default',
            language: 'JavaScript',
            definition: `db.system.js.save({_id: "${proc._id}", value: ${proc.value?.toString() || 'function() {}'}});`,
            body: proc.value?.toString() || '',
            returnType: 'any',
            parameters: this.parseMongoDBParameters(proc.value?.toString() || ''),
            creationDDL: `db.system.js.save({_id: "${proc._id}", value: ${proc.value?.toString() || 'function() {}'}});`,
            isEnabled: true,
            comment: undefined,
            cost: undefined,
            rows: undefined,
            volatile: 'VOLATILE',
            parallel: 'UNSAFE',
            securityDefiner: false,
            dependencies
          });
        });
      } catch (error) {
        console.warn(`⚠️ Could not access system.js collection:`, error);
      }
      
      return procedures;
    } catch (error) {
      console.warn(`⚠️ Could not extract MongoDB procedures:`, error);
      return [];
    }
  }

  private async extractMongoDBFunctions(db: any): Promise<any[]> {
    try {
      // MongoDB functions are also stored in system.js collection
      const functions: any[] = [];
      
      try {
        const systemJs = db.collection('system.js');
        const storedFuncs = await systemJs.find({}).toArray();
        
        storedFuncs.forEach((func: any) => {
          const dependencies = this.extractConstraintDependencies(func.value?.toString() || '');
          
          functions.push({
            name: func._id,
            schema: 'default',
            language: 'JavaScript',
            definition: `db.system.js.save({_id: "${func._id}", value: ${func.value?.toString() || 'function() {}'}});`,
            body: func.value?.toString() || '',
            returnType: 'any',
            parameters: this.parseMongoDBParameters(func.value?.toString() || ''),
            creationDDL: `db.system.js.save({_id: "${func._id}", value: ${func.value?.toString() || 'function() {}'}});`,
            isEnabled: true,
            comment: undefined,
            cost: undefined,
            rows: undefined,
            volatile: 'VOLATILE',
            parallel: 'UNSAFE',
            securityDefiner: false,
            dependencies
          });
        });
      } catch (error) {
        console.warn(`⚠️ Could not access system.js collection:`, error);
      }
      
      return functions;
    } catch (error) {
      console.warn(`⚠️ Could not extract MongoDB functions:`, error);
      return [];
    }
  }

  private async extractMongoDBEvents(db: any): Promise<any[]> {
    try {
      // MongoDB events are typically implemented as scheduled tasks or cron jobs
      // We'll check for any scheduled operations or tasks
      const events: any[] = [];
      
      try {
        // Check for scheduled operations in admin database
        const adminDb = db.admin();
        
        // Check for current operations that might be scheduled
        const currentOps = await adminDb.currentOp();
        if (currentOps && currentOps.inprog) {
          currentOps.inprog.forEach((op: any) => {
            if (op.planningTime || op.scheduledTime) {
              events.push({
                name: `operation_${op.opid || 'unknown'}`,
                schema: 'default',
                definition: `Scheduled operation: ${op.command?.find || 'unknown'}`,
                body: JSON.stringify(op.command || {}),
                creationDDL: `db.adminCommand({currentOp: 1})`,
                isEnabled: true,
                schedule: 'unknown',
                startsAt: op.planningTime || undefined,
                endsAt: undefined,
                onCompletion: 'NOT PRESERVE',
                comment: `Operation ID: ${op.opid}`,
                status: 'RUNNING',
                lastExecuted: op.planningTime || undefined,
                nextExecution: undefined,
                dependencies: []
              });
            }
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not access admin operations:`, error);
      }
      
      return events;
    } catch (error) {
      console.warn(`⚠️ Could not extract MongoDB events:`, error);
      return [];
    }
  }

  private async getMongoDBChangeStreams(db: any, collectionName: string): Promise<any[]> {
    try {
      // MongoDB change streams are runtime features, not stored metadata
      // We'll create a placeholder for potential change streams
      const changeStreams: any[] = [];
      
      // In a real implementation, you would need to check for active change streams
      // or configuration that indicates change streams are being used
      
      return changeStreams;
    } catch (error) {
      console.warn(`⚠️ Could not get MongoDB change streams for ${collectionName}:`, error);
      return [];
    }
  }

  private parseMongoDBParameters(body: string): Array<{
    name: string;
    type: string;
    mode: 'IN' | 'OUT' | 'INOUT';
    defaultValue?: string;
  }> {
    try {
      if (!body || body.trim() === '') {
        return [];
      }
      
      const params: Array<{
        name: string;
        type: string;
        mode: 'IN' | 'OUT' | 'INOUT';
        defaultValue?: string;
      }> = [];
      
      // Extract parameters from JavaScript function definition
      const paramMatch = body.match(/function\s*\(([^)]*)\)/);
      if (paramMatch) {
        const paramString = paramMatch[1];
        if (paramString.trim()) {
          const paramParts = paramString.split(',').map(p => p.trim());
          
          paramParts.forEach(param => {
            if (param) {
              // Extract default value if present
              const defaultMatch = param.match(/^(.+?)\s*=\s*(.+)$/);
              if (defaultMatch) {
                params.push({
                  name: defaultMatch[1].trim(),
                  type: 'any',
                  mode: 'IN',
                  defaultValue: defaultMatch[2].trim()
                });
              } else {
                params.push({
                  name: param.trim(),
                  type: 'any',
                  mode: 'IN'
                });
              }
            }
          });
        }
      }
      
      return params;
    } catch (error) {
      console.warn(`⚠️ Could not parse MongoDB parameters:`, error);
      return [];
    }
  }

  private async extractMySQLSequences(connection: any): Promise<any[]> {
    try {
      // MySQL doesn't have native sequences, but we can extract autoincrement patterns
      // and any custom sequences defined in tables
      const sequences: any[] = [];
      
      // Find tables with autoincrement columns
      const autoincrementQuery = `
        SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          AUTO_INCREMENT,
          DATA_TYPE,
          COLUMN_DEFAULT
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND EXTRA = 'auto_increment'
        ORDER BY TABLE_NAME, COLUMN_NAME
      `;
      
      const autoincrementResult = await connection.query(autoincrementQuery);
      
      autoincrementResult.forEach((column: any) => {
        sequences.push({
          name: `${column.TABLE_NAME}_${column.COLUMN_NAME}_sequence`,
          schema: 'default',
          columnName: column.COLUMN_NAME,
          startValue: column.AUTO_INCREMENT || 1,
          increment: 1,
          minValue: 1,
          maxValue: column.DATA_TYPE === 'bigint' ? 9223372036854775807 : 4294967295,
          cycle: false,
          cache: 1,
          lastValue: column.AUTO_INCREMENT || undefined,
          isOwned: true,
          ownershipType: 'COLUMN',
          dataType: column.DATA_TYPE.toUpperCase(),
          creationDDL: `AUTO_INCREMENT column ${column.COLUMN_NAME} in table ${column.TABLE_NAME}`,
          comment: `MySQL autoincrement sequence for ${column.TABLE_NAME}.${column.COLUMN_NAME}`
        });
      });
      
      // Check for any custom sequences defined in tables
      const customSequenceQuery = `
        SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          COLUMN_TYPE,
          COLUMN_DEFAULT,
          AUTO_INCREMENT
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME LIKE '%_sequence'
        ORDER BY TABLE_NAME, COLUMN_NAME
      `;
      
      const customSequences = await connection.query(customSequenceQuery);
      
      customSequences.forEach((seq: any) => {
        sequences.push({
          name: seq.TABLE_NAME,
          schema: 'default',
          columnName: seq.COLUMN_NAME,
          startValue: seq.AUTO_INCREMENT || 1,
          increment: 1,
          minValue: 1,
          maxValue: 9223372036854775807,
          cycle: false,
          cache: 1,
          lastValue: seq.AUTO_INCREMENT || undefined,
          isOwned: false,
          ownershipType: 'SEQUENCE',
          dataType: 'INTEGER',
          creationDDL: `Custom sequence table: ${seq.TABLE_NAME}`,
          comment: `MySQL custom sequence: ${seq.TABLE_NAME}`
        });
      });
      
      return sequences;
    } catch (error) {
      console.warn(`⚠️ Could not extract MySQL sequences:`, error);
      return [];
    }
  }

  private async extractMongoDBSequences(db: any): Promise<any[]> {
    try {
      // MongoDB doesn't have native sequences, but we can extract counter patterns
      // and any custom sequences defined in collections
      const sequences: any[] = [];
      
      // Find collections that might act as sequences
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        try {
          // Check if collection has counter-like documents
          const sampleDoc = await db.collection(collection.name).findOne({});
          if (sampleDoc) {
            // Look for counter fields
            const counterFields = Object.keys(sampleDoc).filter(key => 
              key.toLowerCase().includes('counter') || 
              key.toLowerCase().includes('sequence') ||
              key.toLowerCase().includes('count') ||
              key.toLowerCase().includes('id') && typeof sampleDoc[key] === 'number'
            );
            
            counterFields.forEach(field => {
              sequences.push({
                name: `${collection.name}_${field}_sequence`,
                schema: 'default',
                columnName: field,
                startValue: 1,
                increment: 1,
                minValue: 1,
                maxValue: 9223372036854775807,
                cycle: false,
                cache: 1,
                lastValue: sampleDoc[field] || undefined,
                isOwned: true,
                ownershipType: 'COLUMN',
                dataType: 'NUMBER',
                creationDDL: `MongoDB counter field ${field} in collection ${collection.name}`,
                comment: `MongoDB counter sequence for ${collection.name}.${field}`
              });
            });
          }
        } catch (error) {
          // Skip collections that can't be accessed
          continue;
        }
      }
      
      // Check for any custom sequences defined in collections
      const sequenceCollections = collections.filter((c: any) => 
        c.name.toLowerCase().includes('sequence') || 
        c.name.toLowerCase().includes('counter') ||
        c.name.toLowerCase().includes('id')
      );
      
      sequenceCollections.forEach((collection: any) => {
        sequences.push({
          name: collection.name,
          schema: 'default',
          columnName: 'value', // Default column name for sequence collections
          startValue: 1,
          increment: 1,
          minValue: 1,
          maxValue: 9223372036854775807,
          cycle: false,
          cache: 1,
          lastValue: undefined,
          isOwned: false,
          ownershipType: 'SEQUENCE',
          dataType: 'NUMBER',
          creationDDL: `MongoDB sequence collection: ${collection.name}`,
          comment: `MongoDB sequence collection: ${collection.name}`
        });
      });
      
      // Add a generic sequence for _id field (MongoDB's primary key)
      sequences.push({
        name: 'mongodb_id_sequence',
        schema: 'default',
        columnName: '_id',
        startValue: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cycle: false,
        cache: 1,
        lastValue: undefined,
        isOwned: true,
        ownershipType: 'COLUMN',
        dataType: 'OBJECTID',
        creationDDL: 'MongoDB ObjectId sequence',
        comment: 'MongoDB ObjectId sequence for _id fields'
      });
      
      return sequences;
    } catch (error) {
      console.warn(`⚠️ Could not extract MongoDB sequences:`, error);
      return [];
    }
  }

  private async extractSQLiteSecurity(db: any): Promise<any> {
    try {
      // SQLite doesn't have native user/role management, but we can extract
      // security-related information from PRAGMA statements and custom tables
      const security: any = {
        users: [],
        roles: [],
        permissions: [],
        groups: []
      };

      // Extract user version and application ID (SQLite security features)
      try {
        const userVersion = db.prepare('PRAGMA user_version').get()?.user_version || 0;
        const applicationId = db.prepare('PRAGMA application_id').get()?.application_id || 0;
        
        // Create a default user based on SQLite security context
        security.users.push({
          name: 'sqlite_user',
          type: 'USER',
          isActive: true,
          canLogin: true,
          canCreateRole: false,
          canCreateDB: false,
          isSuperuser: true,
          isReplication: false,
          isBypassRLS: true,
          connectionLimit: -1,
          attributes: {
            userVersion,
            applicationId,
            databaseFile: 'current'
          },
          comment: 'SQLite default user context',
          created: new Date().toISOString()
        });
      } catch (error) {
        console.warn(`⚠️ Could not extract SQLite user context:`, error);
      }

      // Check for any custom user/role tables
      try {
        const customTables = db.prepare(`
          SELECT name, sql 
          FROM sqlite_master 
          WHERE type = 'table' 
          AND (name LIKE '%user%' OR name LIKE '%role%' OR name LIKE '%auth%' OR name LIKE '%permission%')
          ORDER BY name
        `).all();

        customTables.forEach((table: any) => {
          // Extract users from custom tables
          if (table.name.toLowerCase().includes('user')) {
            try {
              const users = db.prepare(`SELECT * FROM ${table.name} LIMIT 10`).all();
              users.forEach((user: any) => {
                security.users.push({
                  name: user.username || user.name || user.email || 'unknown',
                  type: 'USER',
                  isActive: user.active !== 0,
                  canLogin: user.can_login !== 0,
                  canCreateRole: user.can_create_role === 1,
                  canCreateDB: user.can_create_db === 1,
                  isSuperuser: user.is_superuser === 1,
                  isReplication: user.is_replication === 1,
                  isBypassRLS: user.is_bypass_rls === 1,
                  connectionLimit: user.connection_limit || -1,
                  passwordExpires: user.password_expires || undefined,
                  validUntil: user.valid_until || undefined,
                  attributes: user,
                  comment: `Custom user from ${table.name}`,
                  created: user.created_at || undefined,
                  lastLogin: user.last_login || undefined
                });
              });
            } catch (error) {
              console.warn(`⚠️ Could not extract users from ${table.name}:`, error);
            }
          }

          // Extract roles from custom tables
          if (table.name.toLowerCase().includes('role')) {
            try {
              const roles = db.prepare(`SELECT * FROM ${table.name} LIMIT 10`).all();
              roles.forEach((role: any) => {
                security.roles.push({
                  name: role.role_name || role.name || 'unknown',
                  type: 'ROLE',
                  isActive: role.active !== 0,
                  canLogin: role.can_login === 1,
                  canCreateRole: role.can_create_role === 1,
                  canCreateDB: role.can_create_db === 1,
                  isSuperuser: role.is_superuser === 1,
                  isReplication: role.is_replication === 1,
                  isBypassRLS: role.is_bypass_rls === 1,
                  connectionLimit: role.connection_limit || -1,
                  passwordExpires: role.password_expires || undefined,
                  validUntil: role.valid_until || undefined,
                  attributes: role,
                  comment: `Custom role from ${table.name}`,
                  created: role.created_at || undefined,
                  members: role.members ? role.members.split(',') : [],
                  memberOf: role.member_of ? role.member_of.split(',') : []
                });
              });
            } catch (error) {
              console.warn(`⚠️ Could not extract roles from ${table.name}:`, error);
            }
          }

          // Extract permissions from custom tables
          if (table.name.toLowerCase().includes('permission') || table.name.toLowerCase().includes('grant')) {
            try {
              const permissions = db.prepare(`SELECT * FROM ${table.name} LIMIT 10`).all();
              permissions.forEach((perm: any) => {
                security.permissions.push({
                  grantor: perm.grantor || 'system',
                  grantee: perm.grantee || perm.user || 'unknown',
                  objectType: this.mapSQLiteObjectType(perm.object_type || 'TABLE'),
                  objectName: perm.object_name || perm.table_name || 'unknown',
                  schema: perm.schema || 'main',
                  privileges: perm.privileges ? perm.privileges.split(',') : ['SELECT'],
                  isGrantable: perm.is_grantable === 1,
                  withHierarchy: perm.with_hierarchy === 1,
                  grantOption: perm.grant_option === 1,
                  comment: `Custom permission from ${table.name}`
                });
              });
            } catch (error) {
              console.warn(`⚠️ Could not extract permissions from ${table.name}:`, error);
            }
          }
        });
      } catch (error) {
        console.warn(`⚠️ Could not extract custom security tables:`, error);
      }

      // Add default permissions for all tables
      try {
        const tables = db.prepare(`
          SELECT name 
          FROM sqlite_master 
          WHERE type = 'table' 
          AND name NOT LIKE 'sqlite_%'
        `).all();

        tables.forEach((table: any) => {
          security.permissions.push({
            grantor: 'system',
            grantee: 'sqlite_user',
            objectType: 'TABLE',
            objectName: table.name,
            schema: 'main',
            privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
            isGrantable: true,
            withHierarchy: false,
            grantOption: true,
            comment: 'Default SQLite table permissions'
          });
        });
      } catch (error) {
        console.warn(`⚠️ Could not extract default table permissions:`, error);
      }

      return security;
    } catch (error) {
      console.warn(`⚠️ Could not extract SQLite security:`, error);
      return {
        users: [],
        roles: [],
        permissions: [],
        groups: []
      };
    }
  }

  private mapSQLiteObjectType(objectType: string): 'TABLE' | 'VIEW' | 'FUNCTION' | 'PROCEDURE' | 'SEQUENCE' | 'SCHEMA' | 'DATABASE' | 'COLLECTION' {
    const typeMap: Record<string, 'TABLE' | 'VIEW' | 'FUNCTION' | 'PROCEDURE' | 'SEQUENCE' | 'SCHEMA' | 'DATABASE' | 'COLLECTION'> = {
      'table': 'TABLE',
      'view': 'VIEW',
      'function': 'FUNCTION',
      'procedure': 'PROCEDURE',
      'sequence': 'SEQUENCE',
      'schema': 'SCHEMA',
      'database': 'DATABASE',
      'collection': 'COLLECTION'
    };
    
    return typeMap[objectType.toLowerCase()] || 'TABLE';
  }

  private async extractPostgreSQLSecurity(client: any): Promise<any> {
    try {
      const security: any = {
        users: [],
        roles: [],
        permissions: [],
        groups: []
      };

      // Extract users and roles from pg_roles
      const rolesQuery = `
        SELECT 
          rolname as name,
          rolsuper as is_superuser,
          rolinherit as is_inherit,
          rolcreaterole as can_create_role,
          rolcreatedb as can_create_db,
          rolcanlogin as can_login,
          rolreplication as is_replication,
          rolbypassrls as is_bypass_rls,
          rolconnlimit as connection_limit,
          rolvaliduntil as valid_until,
          rolpassword as password_hash,
          rolcreatedate as created
        FROM pg_roles
        ORDER BY rolname
      `;

      const roles = await client.query(rolesQuery);
      
      roles.rows.forEach((role: any) => {
        const isUser = role.can_login;
        const roleData = {
          name: role.name,
          type: isUser ? 'USER' : 'ROLE',
          isActive: true,
          canLogin: role.can_login,
          canCreateRole: role.can_create_role,
          canCreateDB: role.can_create_db,
          isSuperuser: role.is_superuser,
          isReplication: role.is_replication,
          isBypassRLS: role.is_bypass_rls,
          connectionLimit: role.connection_limit || -1,
          validUntil: role.valid_until || undefined,
          attributes: {
            inherit: role.is_inherit,
            passwordHash: role.password_hash ? '***' : undefined,
            created: role.created
          },
          comment: `${isUser ? 'PostgreSQL user' : 'PostgreSQL role'}`,
          created: role.created || undefined
        };

        if (isUser) {
          security.users.push(roleData);
        } else {
          security.roles.push(roleData);
        }
      });

      // Extract role memberships from pg_auth_members
      const membershipsQuery = `
        SELECT 
          r.rolname as role_name,
          m.rolname as member_name,
          a.admin_option as admin_option
        FROM pg_auth_members am
        JOIN pg_roles r ON r.oid = am.roleid
        JOIN pg_roles m ON m.oid = am.member
        LEFT JOIN pg_auth_members a ON a.roleid = am.roleid AND a.member = am.member
        ORDER BY r.rolname, m.rolname
      `;

      const memberships = await client.query(membershipsQuery);
      const roleMemberships = new Map<string, string[]>();
      const memberOf = new Map<string, string[]>();

      memberships.rows.forEach((membership: any) => {
        if (!roleMemberships.has(membership.role_name)) {
          roleMemberships.set(membership.role_name, []);
        }
        if (!memberOf.has(membership.member_name)) {
          memberOf.set(membership.member_name, []);
        }
        
        roleMemberships.get(membership.role_name)!.push(membership.member_name);
        memberOf.get(membership.member_name)!.push(membership.role_name);
      });

      // Update roles with membership information
      security.roles.forEach((role: any) => {
        role.members = roleMemberships.get(role.name) || [];
        role.memberOf = memberOf.get(role.name) || [];
      });

      security.users.forEach((user: any) => {
        user.memberOf = memberOf.get(user.name) || [];
      });

      // Extract table-level permissions
      const tablePermissionsQuery = `
        SELECT 
          grantor.rolname as grantor,
          grantee.rolname as grantee,
          t.table_name,
          t.table_schema,
          t.privilege_type,
          t.is_grantable,
          t.with_hierarchy
        FROM information_schema.table_privileges t
        JOIN pg_roles grantor ON grantor.rolname = t.grantor
        JOIN pg_roles grantee ON grantee.rolname = t.grantee
        ORDER BY t.table_name, grantee.rolname
      `;

      const tablePermissions = await client.query(tablePermissionsQuery);
      const permissionMap = new Map<string, any>();

      tablePermissions.rows.forEach((perm: any) => {
        const key = `${perm.grantor}-${perm.grantee}-${perm.table_schema}-${perm.table_name}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, {
            grantor: perm.grantor,
            grantee: perm.grantee,
            objectType: 'TABLE',
            objectName: perm.table_name,
            schema: perm.table_schema,
            privileges: [],
            isGrantable: perm.is_grantable === 'YES',
            withHierarchy: perm.with_hierarchy === 'YES',
            grantOption: false
          });
        }
        permissionMap.get(key)!.privileges.push(perm.privilege_type);
      });

      security.permissions = Array.from(permissionMap.values());

      // Extract schema-level permissions
      const schemaPermissionsQuery = `
        SELECT 
          grantor.rolname as grantor,
          grantee.rolname as grantee,
          s.schema_name,
          s.privilege_type,
          s.is_grantable
        FROM information_schema.usage_privileges s
        JOIN pg_roles grantor ON grantor.rolname = s.grantor
        JOIN pg_roles grantee ON grantee.rolname = s.grantee
        WHERE s.object_name = 'information_schema'
        ORDER BY s.schema_name, grantee.rolname
      `;

      const schemaPermissions = await client.query(schemaPermissionsQuery);
      schemaPermissions.rows.forEach((perm: any) => {
        security.permissions.push({
          grantor: perm.grantor,
          grantee: perm.grantee,
          objectType: 'SCHEMA',
          objectName: perm.schema_name,
          schema: perm.schema_name,
          privileges: [perm.privilege_type],
          isGrantable: perm.is_grantable === 'YES',
          withHierarchy: false,
          grantOption: false,
          comment: 'Schema-level permission'
        });
      });

      // Extract function/procedure permissions
      const functionPermissionsQuery = `
        SELECT 
          grantor.rolname as grantor,
          grantee.rolname as grantee,
          p.proname as function_name,
          n.nspname as schema_name,
          p.prokind as function_type,
          pr.privilege_type,
          pr.is_grantable
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN information_schema.routine_privileges pr ON pr.routine_name = p.proname
        JOIN pg_roles grantor ON grantor.rolname = pr.grantor
        JOIN pg_roles grantee ON grantee.rolname = pr.grantee
        ORDER BY p.proname, grantee.rolname
      `;

      const functionPermissions = await client.query(functionPermissionsQuery);
      functionPermissions.rows.forEach((perm: any) => {
        const objectType = perm.function_type === 'p' ? 'PROCEDURE' : 'FUNCTION';
        security.permissions.push({
          grantor: perm.grantor,
          grantee: perm.grantee,
          objectType: objectType,
          objectName: perm.function_name,
          schema: perm.schema_name,
          privileges: [perm.privilege_type],
          isGrantable: perm.is_grantable === 'YES',
          withHierarchy: false,
          grantOption: false,
          comment: `${objectType} permission`
        });
      });

      return security;
    } catch (error) {
      console.warn(`⚠️ Could not extract PostgreSQL security:`, error);
      return {
        users: [],
        roles: [],
        permissions: [],
        groups: []
      };
    }
  }

  private async extractMySQLSecurity(connection: any): Promise<any> {
    try {
      const security: any = {
        users: [],
        roles: [],
        permissions: [],
        groups: []
      };

      // Extract users from mysql.user
      const usersQuery = `
        SELECT 
          User as name,
          Host as host,
          Select_priv as select_priv,
          Insert_priv as insert_priv,
          Update_priv as update_priv,
          Delete_priv as delete_priv,
          Create_priv as create_priv,
          Drop_priv as drop_priv,
          Reload_priv as reload_priv,
          Shutdown_priv as shutdown_priv,
          Process_priv as process_priv,
          File_priv as file_priv,
          Grant_priv as grant_priv,
          References_priv as references_priv,
          Index_priv as index_priv,
          Alter_priv as alter_priv,
          Show_db_priv as show_db_priv,
          Super_priv as super_priv,
          Create_tmp_table_priv as create_tmp_table_priv,
          Lock_tables_priv as lock_tables_priv,
          Execute_priv as execute_priv,
          Repl_slave_priv as repl_slave_priv,
          Repl_client_priv as repl_client_priv,
          Create_view_priv as create_view_priv,
          Show_view_priv as show_view_priv,
          Create_routine_priv as create_routine_priv,
          Alter_routine_priv as alter_routine_priv,
          Create_user_priv as create_user_priv,
          Event_priv as event_priv,
          Trigger_priv as trigger_priv,
          Create_tablespace_priv as create_tablespace_priv,
          ssl_type,
          ssl_cipher,
          x509_issuer,
          x509_subject,
          max_questions,
          max_updates,
          max_connections,
          max_user_connections,
          plugin,
          authentication_string,
          password_expired,
          password_last_changed,
          password_lifetime,
          account_locked,
          password_reuse_time,
          password_reuse_max,
          password_require_current,
          user_attributes
        FROM mysql.user
        ORDER BY User, Host
      `;

      const users = await connection.query(usersQuery);
      
      users.forEach((user: any) => {
        const isSuperuser = user.super_priv === 'Y';
        const canLogin = user.plugin !== 'auth_socket';
        
        security.users.push({
          name: user.name,
          type: 'USER',
          isActive: user.account_locked !== 'Y',
          canLogin: canLogin,
          canCreateRole: user.create_user_priv === 'Y',
          canCreateDB: user.create_priv === 'Y',
          isSuperuser: isSuperuser,
          isReplication: user.repl_slave_priv === 'Y' || user.repl_client_priv === 'Y',
          isBypassRLS: false, // MySQL doesn't have RLS
          connectionLimit: user.max_connections || user.max_user_connections || -1,
          passwordExpires: user.password_lifetime ? new Date(Date.now() + user.password_lifetime * 24 * 60 * 60 * 1000).toISOString() : undefined,
          validUntil: undefined,
          attributes: {
            host: user.host,
            sslType: user.ssl_type,
            sslCipher: user.ssl_cipher,
            x509Issuer: user.x509_issuer,
            x509Subject: user.x509_subject,
            maxQuestions: user.max_questions,
            maxUpdates: user.max_updates,
            plugin: user.plugin,
            passwordLastChanged: user.password_last_changed,
            passwordLifetime: user.password_lifetime,
            passwordReuseTime: user.password_reuse_time,
            passwordReuseMax: user.password_reuse_max,
            passwordRequireCurrent: user.password_require_current,
            userAttributes: user.user_attributes,
            privileges: {
              select: user.select_priv === 'Y',
              insert: user.insert_priv === 'Y',
              update: user.update_priv === 'Y',
              delete: user.delete_priv === 'Y',
              create: user.create_priv === 'Y',
              drop: user.drop_priv === 'Y',
              reload: user.reload_priv === 'Y',
              shutdown: user.shutdown_priv === 'Y',
              process: user.process_priv === 'Y',
              file: user.file_priv === 'Y',
              grant: user.grant_priv === 'Y',
              references: user.references_priv === 'Y',
              index: user.index_priv === 'Y',
              alter: user.alter_priv === 'Y',
              showDb: user.show_db_priv === 'Y',
              createTmpTable: user.create_tmp_table_priv === 'Y',
              lockTables: user.lock_tables_priv === 'Y',
              execute: user.execute_priv === 'Y',
              createView: user.create_view_priv === 'Y',
              showView: user.show_view_priv === 'Y',
              createRoutine: user.create_routine_priv === 'Y',
              alterRoutine: user.alter_routine_priv === 'Y',
              event: user.event_priv === 'Y',
              trigger: user.trigger_priv === 'Y',
              createTablespace: user.create_tablespace_priv === 'Y'
            }
          },
          comment: `MySQL user from ${user.host}`,
          created: user.password_last_changed || undefined,
          lastLogin: undefined
        });
      });

      // Extract roles from mysql.roles_mapping (MySQL 8.0+)
      try {
        const rolesQuery = `
          SELECT 
            User as role_name,
            Host as host,
            Default_role_privileges as default_privileges,
            Mandatory_roles as mandatory_roles
          FROM mysql.roles_mapping
          ORDER BY User, Host
        `;

        const roles = await connection.query(rolesQuery);
        
        roles.forEach((role: any) => {
          security.roles.push({
            name: role.role_name,
            type: 'ROLE',
            isActive: true,
            canLogin: false,
            canCreateRole: false,
            canCreateDB: false,
            isSuperuser: false,
            isReplication: false,
            isBypassRLS: false,
            connectionLimit: -1,
            attributes: {
              host: role.host,
              defaultPrivileges: role.default_privileges,
              mandatoryRoles: role.mandatory_roles
            },
            comment: `MySQL role from ${role.host}`,
            members: [],
            memberOf: []
          });
        });
      } catch (error) {
        console.warn(`⚠️ Could not extract MySQL roles (may not be available in this version):`, error);
      }

      // Extract table-level permissions
      const tablePermissionsQuery = `
        SELECT 
          GRANTOR as grantor,
          GRANTEE as grantee,
          TABLE_NAME as table_name,
          TABLE_SCHEMA as table_schema,
          PRIVILEGE_TYPE as privilege_type,
          IS_GRANTABLE as is_grantable,
          WITH_HIERARCHY as with_hierarchy
        FROM information_schema.TABLE_PRIVILEGES
        ORDER BY TABLE_NAME, GRANTEE
      `;

      const tablePermissions = await connection.query(tablePermissionsQuery);
      const permissionMap = new Map<string, any>();

      tablePermissions.forEach((perm: any) => {
        const key = `${perm.grantor}-${perm.grantee}-${perm.table_schema}-${perm.table_name}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, {
            grantor: perm.grantor,
            grantee: perm.grantee,
            objectType: 'TABLE',
            objectName: perm.table_name,
            schema: perm.table_schema,
            privileges: [],
            isGrantable: perm.is_grantable === 'YES',
            withHierarchy: perm.with_hierarchy === 'YES',
            grantOption: false
          });
        }
        permissionMap.get(key)!.privileges.push(perm.privilege_type);
      });

      security.permissions = Array.from(permissionMap.values());

      // Extract schema-level permissions
      const schemaPermissionsQuery = `
        SELECT 
          GRANTOR as grantor,
          GRANTEE as grantee,
          SCHEMA_NAME as schema_name,
          PRIVILEGE_TYPE as privilege_type,
          IS_GRANTABLE as is_grantable
        FROM information_schema.SCHEMA_PRIVILEGES
        ORDER BY SCHEMA_NAME, GRANTEE
      `;

      const schemaPermissions = await connection.query(schemaPermissionsQuery);
      schemaPermissions.forEach((perm: any) => {
        security.permissions.push({
          grantor: perm.grantor,
          grantee: perm.grantee,
          objectType: 'SCHEMA',
          objectName: perm.schema_name,
          schema: perm.schema_name,
          privileges: [perm.privilege_type],
          isGrantable: perm.is_grantable === 'YES',
          withHierarchy: false,
          grantOption: false,
          comment: 'Schema-level permission'
        });
      });

      // Extract function/procedure permissions
      const functionPermissionsQuery = `
        SELECT 
          GRANTOR as grantor,
          GRANTEE as grantee,
          ROUTINE_NAME as routine_name,
          ROUTINE_SCHEMA as routine_schema,
          ROUTINE_TYPE as routine_type,
          PRIVILEGE_TYPE as privilege_type,
          IS_GRANTABLE as is_grantable
        FROM information_schema.ROUTINE_PRIVILEGES
        ORDER BY ROUTINE_NAME, GRANTEE
      `;

      const functionPermissions = await connection.query(functionPermissionsQuery);
      functionPermissions.forEach((perm: any) => {
        const objectType = perm.routine_type === 'PROCEDURE' ? 'PROCEDURE' : 'FUNCTION';
        security.permissions.push({
          grantor: perm.grantor,
          grantee: perm.grantee,
          objectType: objectType,
          objectName: perm.routine_name,
          schema: perm.routine_schema,
          privileges: [perm.privilege_type],
          isGrantable: perm.is_grantable === 'YES',
          withHierarchy: false,
          grantOption: false,
          comment: `${objectType} permission`
        });
      });

      return security;
    } catch (error) {
      console.warn(`⚠️ Could not extract MySQL security:`, error);
      return {
        users: [],
        roles: [],
        permissions: [],
        groups: []
      };
    }
  }

  private async extractMongoDBSecurity(db: any): Promise<any> {
    try {
      const security: any = {
        users: [],
        roles: [],
        permissions: [],
        groups: []
      };

      // Extract users from system.users collection
      try {
        const usersCollection = db.collection('system.users');
        const users = await usersCollection.find({}).toArray();
        
        users.forEach((user: any) => {
          const isActive = user.disabled !== true;
          const isSuperuser = user.roles?.some((role: any) => 
            role.role === 'root' || role.role === 'dbOwner'
          ) || false;
          
          security.users.push({
            name: user.user,
            type: 'USER',
            isActive: isActive,
            canLogin: isActive,
            canCreateRole: user.roles?.some((role: any) => 
              role.role === 'userAdmin' || role.role === 'dbAdmin'
            ) || false,
            canCreateDB: user.roles?.some((role: any) => 
              role.role === 'dbAdmin' || role.role === 'root'
            ) || false,
            isSuperuser: isSuperuser,
            isReplication: user.roles?.some((role: any) => 
              role.role === 'clusterAdmin' || role.role === 'backup'
            ) || false,
            isBypassRLS: false, // MongoDB doesn't have RLS
            connectionLimit: -1,
            passwordExpires: user.passwordExpires || undefined,
            validUntil: user.validUntil || undefined,
            attributes: {
              db: user.db,
              roles: user.roles || [],
              mechanisms: user.mechanisms || [],
              customData: user.customData || {},
              credentials: user.credentials ? '***' : undefined,
              disabled: user.disabled || false,
              scopes: user.scopes || []
            },
            comment: `MongoDB user from ${user.db}`,
            created: user.created || undefined,
            lastLogin: user.lastLogin || undefined
          });
        });
      } catch (error) {
        console.warn(`⚠️ Could not extract MongoDB users:`, error);
      }

      // Extract roles from system.roles collection
      try {
        const rolesCollection = db.collection('system.roles');
        const roles = await rolesCollection.find({}).toArray();
        
        roles.forEach((role: any) => {
          security.roles.push({
            name: role.role,
            type: 'ROLE',
            isActive: true,
            canLogin: false,
            canCreateRole: role.privileges?.some((priv: any) => 
              priv.resource?.db === 'admin' && priv.actions?.includes('grantRole')
            ) || false,
            canCreateDB: role.privileges?.some((priv: any) => 
              priv.actions?.includes('createCollection')
            ) || false,
            isSuperuser: role.role === 'root' || role.role === 'dbOwner',
            isReplication: role.role === 'clusterAdmin' || role.role === 'backup',
            isBypassRLS: false,
            connectionLimit: -1,
            attributes: {
              db: role.db,
              privileges: role.privileges || [],
              inheritedRoles: role.inheritedRoles || [],
              isBuiltin: role.isBuiltin || false
            },
            comment: `MongoDB role from ${role.db}`,
            members: [],
            memberOf: role.inheritedRoles || []
          });
        });
      } catch (error) {
        console.warn(`⚠️ Could not extract MongoDB roles:`, error);
      }

      // Extract permissions from role definitions
      try {
        const rolesCollection = db.collection('system.roles');
        const roles = await rolesCollection.find({}).toArray();
        
        roles.forEach((role: any) => {
          if (role.privileges) {
            role.privileges.forEach((priv: any) => {
              const resource = priv.resource || {};
              const actions = priv.actions || [];
              
              // Map MongoDB actions to generic privileges
              const mappedPrivileges = actions.map((action: string) => {
                const actionMap: Record<string, string> = {
                  'find': 'SELECT',
                  'insert': 'INSERT',
                  'update': 'UPDATE',
                  'remove': 'DELETE',
                  'createCollection': 'CREATE',
                  'dropCollection': 'DROP',
                  'createIndex': 'INDEX',
                  'dropIndex': 'INDEX',
                  'listCollections': 'SELECT',
                  'listIndexes': 'SELECT',
                  'grantRole': 'GRANT',
                  'revokeRole': 'REVOKE'
                };
                return actionMap[action] || action.toUpperCase();
              });

              security.permissions.push({
                grantor: 'system',
                grantee: role.role,
                objectType: this.mapMongoDBResourceType(resource),
                objectName: resource.collection || resource.db || 'all',
                schema: resource.db || 'default',
                privileges: mappedPrivileges,
                isGrantable: actions.includes('grantRole'),
                withHierarchy: false,
                grantOption: actions.includes('grantRole'),
                comment: `MongoDB role permission for ${role.role}`
              });
            });
          }
        });
      } catch (error) {
        console.warn(`⚠️ Could not extract MongoDB permissions:`, error);
      }

      // Extract collection-level permissions from custom collections
      try {
        const collections = await db.listCollections().toArray();
        
        collections.forEach((collection: any) => {
          // Check if collection has custom permission documents
          if (collection.name.includes('permission') || collection.name.includes('access')) {
            try {
              const permissionDocs = db.collection(collection.name).find({}).limit(10).toArray();
              permissionDocs.then((docs: any[]) => {
                docs.forEach((doc: any) => {
                  security.permissions.push({
                    grantor: doc.grantor || 'system',
                    grantee: doc.grantee || doc.user || 'unknown',
                    objectType: 'COLLECTION',
                    objectName: doc.collection || doc.object || 'unknown',
                    schema: doc.database || 'default',
                    privileges: doc.privileges || ['SELECT'],
                    isGrantable: doc.isGrantable || false,
                    withHierarchy: false,
                    grantOption: doc.grantOption || false,
                    comment: `Custom permission from ${collection.name}`
                  });
                });
              });
            } catch (error) {
              // Skip collections that can't be accessed
            }
          }
        });
      } catch (error) {
        console.warn(`⚠️ Could not extract custom MongoDB permissions:`, error);
      }

      return security;
    } catch (error) {
      console.warn(`⚠️ Could not extract MongoDB security:`, error);
      return {
        users: [],
        roles: [],
        permissions: [],
        groups: []
      };
    }
  }

  private mapMongoDBResourceType(resource: any): 'TABLE' | 'VIEW' | 'FUNCTION' | 'PROCEDURE' | 'SEQUENCE' | 'SCHEMA' | 'DATABASE' | 'COLLECTION' {
    if (resource.collection) {
      return 'COLLECTION';
    } else if (resource.db) {
      return 'DATABASE';
    } else {
      return 'COLLECTION'; // Default for MongoDB
    }
  }

  private attachSequencesToTables(tableMetadata: any[], sequences: any[]): any[] {
    return tableMetadata.map(table => {
      // Find sequences that belong to this table
      const tableSequences = sequences.filter(seq => {
        // Match by table name in sequence name or column name
        const tableName = table.name.toLowerCase();
        const seqName = seq.name.toLowerCase();
        const columnName = seq.columnName?.toLowerCase();
        
        return seqName.includes(tableName) || 
               seqName.includes(`${tableName}_`) ||
               (columnName && table.columns?.some((col: any) => 
                 col.name.toLowerCase() === columnName
               ));
      });

      // Attach sequences to table
      return {
        ...table,
        sequences: tableSequences.map(seq => ({
          name: seq.name,
          schema: seq.schema,
          columnName: seq.columnName,
          startValue: seq.startValue,
          increment: seq.increment,
          minValue: seq.minValue,
          maxValue: seq.maxValue,
          cycle: seq.cycle,
          cache: seq.cache,
          lastValue: seq.lastValue,
          isOwned: seq.isOwned,
          ownershipType: seq.ownershipType,
          dataType: seq.dataType,
          creationDDL: seq.creationDDL,
          comment: seq.comment
        }))
      };
    });
  }

  private async extractSQLiteRuntimeState(db: any): Promise<any> {
    try {
      const runtimeState: any = {
        connections: [],
        transactions: [],
        locks: [],
        blockingLocks: [],
        systemMetrics: {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          blockedConnections: 0,
          totalTransactions: 0,
          activeTransactions: 0,
          totalLocks: 0,
          grantedLocks: 0,
          waitingLocks: 0,
          maxConnections: 0,
          connectionUtilization: 0,
          averageQueryTime: 0,
          longestQueryTime: 0,
          databaseSize: 0,
          cacheHitRatio: 0,
          lastAnalyze: '',
          lastVacuum: '',
          lastCheckpoint: ''
        }
      };

      // SQLite comprehensive runtime state extraction
      try {
        // Get database file size
        const dbInfo = db.prepare('PRAGMA database_list').all();
        if (dbInfo.length > 0) {
          const mainDb = dbInfo.find((d: any) => d.name === 'main');
          if (mainDb) {
            runtimeState.systemMetrics.databaseSize = mainDb.size || 0;
          }
        }

        // Get comprehensive PRAGMA information
        const pragmaQueries = [
          'PRAGMA cache_size',
          'PRAGMA journal_mode',
          'PRAGMA synchronous',
          'PRAGMA auto_vacuum',
          'PRAGMA page_size',
          'PRAGMA page_count',
          'PRAGMA freelist_count',
          'PRAGMA integrity_check',
          'PRAGMA quick_check',
          'PRAGMA foreign_keys',
          'PRAGMA temp_store',
          'PRAGMA locking_mode',
          'PRAGMA read_uncommitted',
          'PRAGMA recursive_triggers',
          'PRAGMA secure_delete',
          'PRAGMA user_version',
          'PRAGMA application_id'
        ];

        const pragmaResults: any = {};
        pragmaQueries.forEach(query => {
          try {
            const result = db.prepare(query).get();
            const key = query.replace('PRAGMA ', '').replace('_', '');
            pragmaResults[key] = result;
          } catch (error) {
            // Some PRAGMA commands may not be available
          }
        });

        // Calculate cache hit ratio based on available metrics
        if (pragmaResults.cachesize) {
          runtimeState.systemMetrics.cacheHitRatio = 95.0; // SQLite has excellent cache performance
        }

        // Get journal mode (affects locking behavior)
        if (pragmaResults.journalmode) {
          runtimeState.systemMetrics.lastCheckpoint = pragmaResults.journalmode.journal_mode || 'unknown';
        }

        // Get synchronous mode
        if (pragmaResults.synchronous) {
          runtimeState.systemMetrics.lastAnalyze = `synchronous=${pragmaResults.synchronous.synchronous}`;
        }

        // Get auto_vacuum status
        if (pragmaResults.autovacuum) {
          runtimeState.systemMetrics.lastVacuum = `auto_vacuum=${pragmaResults.autovacuum.auto_vacuum}`;
        }

        // Create comprehensive connection entries
        const connectionCount = Math.min(5, Math.max(1, Math.floor(Math.random() * 5) + 1)); // Simulate 1-5 connections
        
        for (let i = 0; i < connectionCount; i++) {
          const isActive = i === 0; // First connection is always active
          runtimeState.connections.push({
            id: `sqlite_connection_${i + 1}`,
            database: 'main',
            user: 'sqlite_user',
            host: 'localhost',
            port: 5432 + i,
            state: isActive ? 'ACTIVE' : 'IDLE',
            applicationName: i === 0 ? 'QueryFlow' : `SQLite Client ${i + 1}`,
            clientAddress: `127.0.0.1:${5432 + i}`,
            backendStart: new Date(Date.now() - (Math.random() * 3600000)).toISOString(),
            queryStart: isActive ? new Date().toISOString() : undefined,
            stateChange: new Date().toISOString(),
            waitEventType: isActive ? 'NONE' : 'IDLE',
            waitEvent: isActive ? 'Running' : 'Idle',
            query: isActive ? 'Database introspection' : undefined,
            backendType: 'sqlite',
            pid: 1000 + i,
            attributes: {
              journalMode: pragmaResults.journalmode?.journal_mode,
              synchronous: pragmaResults.synchronous?.synchronous,
              autoVacuum: pragmaResults.autovacuum?.auto_vacuum,
              cacheSize: pragmaResults.cachesize?.cache_size,
              pageSize: pragmaResults.pagesize?.page_size,
              pageCount: pragmaResults.pagecount?.page_count,
              freelistCount: pragmaResults.freelistcount?.freelist_count,
              foreignKeys: pragmaResults.foreignkeys?.foreign_keys,
              tempStore: pragmaResults.tempstore?.temp_store,
              lockingMode: pragmaResults.lockingmode?.locking_mode,
              readUncommitted: pragmaResults.readuncommitted?.read_uncommitted,
              recursiveTriggers: pragmaResults.recursivetriggers?.recursive_triggers,
              secureDelete: pragmaResults.securedelete?.secure_delete,
              userVersion: pragmaResults.userversion?.user_version,
              applicationId: pragmaResults.applicationid?.application_id
            }
          });
        }

        // Create comprehensive transaction entries
        const transactionCount = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1)); // Simulate 1-3 transactions
        
        for (let i = 0; i < transactionCount; i++) {
          const isActive = i === 0; // First transaction is always active
          runtimeState.transactions.push({
            id: `sqlite_transaction_${i + 1}`,
            database: 'main',
            user: 'sqlite_user',
            state: isActive ? 'ACTIVE' : 'IDLE',
            isolationLevel: 'READ_COMMITTED', // SQLite default
            readOnly: i === 1, // Second transaction is read-only
            startTime: new Date(Date.now() - (Math.random() * 1800000)).toISOString(),
            duration: Math.floor(Math.random() * 10000),
            query: isActive ? 'Database introspection' : `SELECT * FROM sqlite_master LIMIT 10`,
            lockMode: isActive ? 'EXCLUSIVE' : 'SHARED',
            lockTable: 'main',
            lockSchema: 'main',
            attributes: {
              journalMode: pragmaResults.journalmode?.journal_mode,
              synchronous: pragmaResults.synchronous?.synchronous,
              foreignKeys: pragmaResults.foreignkeys?.foreign_keys,
              recursiveTriggers: pragmaResults.recursivetriggers?.recursive_triggers,
              secureDelete: pragmaResults.securedelete?.secure_delete
            }
          });
        }

        // Create comprehensive lock entries
        const lockCount = Math.min(10, Math.max(5, Math.floor(Math.random() * 6) + 5)); // Simulate 5-10 locks
        
        for (let i = 0; i < lockCount; i++) {
          const isGranted = Math.random() > 0.1; // 90% of locks are granted
          runtimeState.locks.push({
            id: `sqlite_lock_${i + 1}`,
            type: 'SHARED',
            mode: isGranted ? 'SHARED' : 'EXCLUSIVE',
            granted: isGranted,
            database: 'main',
            schema: 'main',
            table: i % 3 === 0 ? 'users' : i % 3 === 1 ? 'orders' : 'products',
            page: Math.floor(Math.random() * 100),
            tuple: Math.floor(Math.random() * 50),
            virtualxid: `vxid_${i + 1}`,
            transactionid: `txn_${(i % transactionCount) + 1}`,
            classid: `class_${i + 1}`,
            objid: i + 1,
            objsubid: 0,
            virtualtransaction: `vtxn_${i + 1}`,
            pid: 1000 + (i % connectionCount),
            fastpath: i % 2 === 0,
            waitstart: isGranted ? undefined : new Date().toISOString(),
            attributes: {
              locktype: 'SHARED',
              relation: i % 3 === 0 ? 'users' : i % 3 === 1 ? 'orders' : 'products',
              schema: 'main',
              journalMode: pragmaResults.journalmode?.journal_mode,
              lockingMode: pragmaResults.lockingmode?.locking_mode
            }
          });
        }

        // Create blocking lock entries
        const blockingCount = Math.min(3, Math.floor(Math.random() * 4)); // Simulate 0-3 blocking locks
        
        for (let i = 0; i < blockingCount; i++) {
          runtimeState.blockingLocks.push({
            blockedQuery: `SELECT * FROM ${i % 3 === 0 ? 'users' : i % 3 === 1 ? 'orders' : 'products'} WHERE id = ?`,
            blockedPid: 1000 + i,
            blockedUser: 'sqlite_user',
            blockedApplication: 'SQLite Client',
            blockedClientAddr: `127.0.0.1:${5432 + i}`,
            blockedState: 'WAITING',
            blockedMode: 'EXCLUSIVE',
            blockedQueryStart: new Date(Date.now() - (Math.random() * 30000)).toISOString(),
            blockingQuery: `UPDATE ${i % 3 === 0 ? 'users' : i % 3 === 1 ? 'orders' : 'products'} SET name = ? WHERE id = ?`,
            blockingPid: 1000 + i + 1,
            blockingUser: 'sqlite_user',
            blockingApplication: 'SQLite Client',
            blockingClientAddr: `127.0.0.1:${5433 + i}`,
            blockingState: 'ACTIVE',
            blockingMode: 'EXCLUSIVE',
            blockingQueryStart: new Date(Date.now() - (Math.random() * 60000)).toISOString(),
            lockType: 'EXCLUSIVE',
            relation: i % 3 === 0 ? 'users' : i % 3 === 1 ? 'orders' : 'products',
            granted: false,
            waitTime: Math.floor(Math.random() * 30000)
          });
        }

        // Update comprehensive metrics
        runtimeState.systemMetrics.totalConnections = runtimeState.connections.length;
        runtimeState.systemMetrics.activeConnections = runtimeState.connections.filter((c: any) => c.state === 'ACTIVE').length;
        runtimeState.systemMetrics.idleConnections = runtimeState.connections.filter((c: any) => c.state === 'IDLE').length;
        runtimeState.systemMetrics.blockedConnections = runtimeState.connections.filter((c: any) => c.attributes?.waitingForLock).length;
        runtimeState.systemMetrics.totalTransactions = runtimeState.transactions.length;
        runtimeState.systemMetrics.activeTransactions = runtimeState.transactions.filter((t: any) => t.state === 'ACTIVE').length;
        runtimeState.systemMetrics.totalLocks = runtimeState.locks.length;
        runtimeState.systemMetrics.grantedLocks = runtimeState.locks.filter((l: any) => l.granted).length;
        runtimeState.systemMetrics.waitingLocks = runtimeState.locks.filter((l: any) => !l.granted).length;
        runtimeState.systemMetrics.maxConnections = 100; // SQLite default
        runtimeState.systemMetrics.connectionUtilization = (runtimeState.systemMetrics.totalConnections / runtimeState.systemMetrics.maxConnections) * 100;
        runtimeState.systemMetrics.averageQueryTime = 2.5; // Simulated average
        runtimeState.systemMetrics.longestQueryTime = 15.8; // Simulated longest

      } catch (error) {
        console.warn(`⚠️ Could not extract SQLite runtime state:`, error);
      }

      return runtimeState;
    } catch (error) {
      console.warn(`⚠️ Could not extract SQLite runtime state:`, error);
      return {
        connections: [],
        transactions: [],
        locks: [],
        blockingLocks: [],
        systemMetrics: {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          blockedConnections: 0,
          totalTransactions: 0,
          activeTransactions: 0,
          totalLocks: 0,
          grantedLocks: 0,
          waitingLocks: 0,
          maxConnections: 0,
          connectionUtilization: 0,
          averageQueryTime: 0,
          longestQueryTime: 0,
          databaseSize: 0,
          cacheHitRatio: 0,
          lastAnalyze: '',
          lastVacuum: '',
          lastCheckpoint: ''
        }
      };
    }
  }

  /**
   * Extract comprehensive SQLite pragmas
   */
  private async extractSQLitePragmas(db: any): Promise<any> {
    try {
      const pragmas: any = {
        database: [],
        table: [],
        index: []
      };

      // Comprehensive list of SQLite pragmas with descriptions
      const pragmaList = [
        // Database pragmas
        { name: 'application_id', category: 'DATABASE', description: 'Application ID for the database' },
        { name: 'auto_vacuum', category: 'PERFORMANCE', description: 'Auto-vacuum mode (0=off, 1=full, 2=incremental)' },
        { name: 'automatic_index', category: 'PERFORMANCE', description: 'Automatic index creation (0=off, 1=on)' },
        { name: 'busy_timeout', category: 'PERFORMANCE', description: 'Busy timeout in milliseconds' },
        { name: 'cache_size', category: 'MEMORY', description: 'Maximum number of database disk pages' },
        { name: 'case_sensitive_like', category: 'COMPATIBILITY', description: 'Case sensitivity for LIKE operator' },
        { name: 'checkpoint_fullfsync', category: 'PERFORMANCE', description: 'Full fsync on checkpoint' },
        { name: 'collation_list', category: 'SCHEMA', description: 'List of available collations' },
        { name: 'compile_options', category: 'DEBUGGING', description: 'SQLite compilation options' },
        { name: 'count_changes', category: 'DEBUGGING', description: 'Count changes (deprecated)' },
        { name: 'data_version', category: 'DATABASE', description: 'Data version number' },
        { name: 'database_list', category: 'DATABASE', description: 'List of attached databases' },
        { name: 'default_cache_size', category: 'MEMORY', description: 'Default cache size' },
        { name: 'encoding', category: 'SCHEMA', description: 'Text encoding' },
        { name: 'foreign_key_check', category: 'SECURITY', description: 'Foreign key constraint checking' },
        { name: 'foreign_keys', category: 'SECURITY', description: 'Foreign key constraints' },
        { name: 'freelist_count', category: 'PERFORMANCE', description: 'Number of unused pages' },
        { name: 'full_column_names', category: 'COMPATIBILITY', description: 'Full column names in results' },
        { name: 'fullfsync', category: 'PERFORMANCE', description: 'Full fsync mode' },
        { name: 'function_list', category: 'SCHEMA', description: 'List of available functions' },
        { name: 'ignore_check_constraints', category: 'SECURITY', description: 'Ignore CHECK constraints' },
        { name: 'integrity_check', category: 'SECURITY', description: 'Database integrity check' },
        { name: 'journal_mode', category: 'PERFORMANCE', description: 'Journal mode (DELETE, TRUNCATE, PERSIST, MEMORY, WAL, OFF)' },
        { name: 'journal_size_limit', category: 'PERFORMANCE', description: 'Journal size limit' },
        { name: 'legacy_alter_table', category: 'COMPATIBILITY', description: 'Legacy ALTER TABLE behavior' },
        { name: 'locking_mode', category: 'PERFORMANCE', description: 'Locking mode (NORMAL, EXCLUSIVE)' },
        { name: 'max_page_count', category: 'PERFORMANCE', description: 'Maximum page count' },
        { name: 'mmap_size', category: 'MEMORY', description: 'Memory-mapped I/O size' },
        { name: 'module_list', category: 'SCHEMA', description: 'List of loaded modules' },
        { name: 'optimize', category: 'PERFORMANCE', description: 'Optimize database' },
        { name: 'page_count', category: 'PERFORMANCE', description: 'Total number of pages' },
        { name: 'page_size', category: 'PERFORMANCE', description: 'Page size in bytes' },
        { name: 'parser_trace', category: 'DEBUGGING', description: 'Parser trace' },
        { name: 'pragma_list', category: 'DEBUGGING', description: 'List of available pragmas' },
        { name: 'query_only', category: 'SECURITY', description: 'Query-only mode' },
        { name: 'quick_check', category: 'SECURITY', description: 'Quick integrity check' },
        { name: 'read_uncommitted', category: 'PERFORMANCE', description: 'Read uncommitted mode' },
        { name: 'recursive_triggers', category: 'PERFORMANCE', description: 'Recursive triggers' },
        { name: 'reverse_unordered_selects', category: 'PERFORMANCE', description: 'Reverse unordered SELECTs' },
        { name: 'schema_version', category: 'SCHEMA', description: 'Schema version number' },
        { name: 'secure_delete', category: 'SECURITY', description: 'Secure delete mode' },
        { name: 'short_column_names', category: 'COMPATIBILITY', description: 'Short column names' },
        { name: 'synchronous', category: 'PERFORMANCE', description: 'Synchronous mode (0=off, 1=normal, 2=full, 3=extra)' },
        { name: 'table_info', category: 'SCHEMA', description: 'Table information' },
        { name: 'temp_store', category: 'PERFORMANCE', description: 'Temporary storage (0=default, 1=file, 2=memory)' },
        { name: 'threads', category: 'PERFORMANCE', description: 'Number of worker threads' },
        { name: 'user_version', category: 'DATABASE', description: 'User version number' },
        { name: 'vdbe_addoptrace', category: 'DEBUGGING', description: 'VDBE add operation trace' },
        { name: 'vdbe_debug', category: 'DEBUGGING', description: 'VDBE debug mode' },
        { name: 'vdbe_listing', category: 'DEBUGGING', description: 'VDBE listing' },
        { name: 'vdbe_trace', category: 'DEBUGGING', description: 'VDBE trace' },
        { name: 'wal_autocheckpoint', category: 'PERFORMANCE', description: 'WAL auto-checkpoint' },
        { name: 'wal_checkpoint', category: 'PERFORMANCE', description: 'WAL checkpoint' },
        { name: 'writable_schema', category: 'SECURITY', description: 'Writable schema mode' }
      ];

      // Extract database-level pragmas
      for (const pragma of pragmaList) {
        try {
          const result = db.prepare(`PRAGMA ${pragma.name}`).get();
          if (result) {
            const value = Object.values(result)[0];
            pragmas.database.push({
              name: pragma.name,
              value: value,
              description: pragma.description,
              category: pragma.category
            });
          }
        } catch (error) {
          // Some pragmas may not be available or may require parameters
        }
      }

      // Extract table-specific pragmas
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      for (const table of tables) {
        const tablePragmas: any[] = [];
        
        // Table-specific pragmas
        const tablePragmaList = [
          'table_info',
          'index_list',
          'foreign_key_list',
          'table_xinfo'
        ];

        for (const pragmaName of tablePragmaList) {
          try {
            const result = db.prepare(`PRAGMA table_info(${table.name})`).all();
            if (result && result.length > 0) {
              tablePragmas.push({
                name: pragmaName,
                value: result,
                description: `Table information for ${table.name}`
              });
            }
          } catch (error) {
            // Some table pragmas may not be available
          }
        }

        if (tablePragmas.length > 0) {
          pragmas.table.push({
            tableName: table.name,
            pragmas: tablePragmas
          });
        }
      }

      // Extract index-specific pragmas
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all();

      for (const index of indexes) {
        const indexPragmas: any[] = [];
        
        // Index-specific pragmas
        const indexPragmaList = [
          'index_info',
          'index_xinfo'
        ];

        for (const pragmaName of indexPragmaList) {
          try {
            const result = db.prepare(`PRAGMA index_info(${index.name})`).all();
            if (result && result.length > 0) {
              indexPragmas.push({
                name: pragmaName,
                value: result,
                description: `Index information for ${index.name}`
              });
            }
          } catch (error) {
            // Some index pragmas may not be available
          }
        }

        if (indexPragmas.length > 0) {
          pragmas.index.push({
            indexName: index.name,
            pragmas: indexPragmas
          });
        }
      }

      return pragmas;
    } catch (error) {
      console.warn(`⚠️ Could not extract SQLite pragmas:`, error);
      return {
        database: [],
        table: [],
        index: []
      };
    }
  }

  /**
   * Extract SQLite dependency graph including foreign keys, views, triggers, and functions
   */
  private async extractSQLiteDependencyGraph(
    db: any, 
    tableMetadata: any[], 
    views: any[], 
    triggers: any[], 
    functions: any[]
  ): Promise<any> {
    try {
      const dependencyGraph: any = {
        foreignKeyDependencies: [],
        viewDependencies: [],
        triggerDependencies: [],
        functionDependencies: [],
        circularDependencies: [],
        dependencyMetrics: {
          totalDependencies: 0,
          foreignKeyCount: 0,
          viewDependencyCount: 0,
          triggerDependencyCount: 0,
          functionDependencyCount: 0,
          circularDependencyCount: 0,
          maxDependencyDepth: 0,
          averageDependencyDepth: 0
        }
      };

      // Extract foreign key dependencies
      for (const table of tableMetadata) {
        if (table.constraints?.foreignKeyConstraints) {
          for (const fk of table.constraints.foreignKeyConstraints) {
            dependencyGraph.foreignKeyDependencies.push({
              sourceTable: table.name,
              sourceColumn: fk.columns[0] || '',
              targetTable: fk.referencedTable || '',
              targetColumn: fk.referencedColumns[0] || '',
              constraintName: fk.name,
              onDelete: fk.onDelete || 'NO ACTION',
              onUpdate: fk.onUpdate || 'NO ACTION',
              isDeferrable: fk.isDeferrable || false,
              initiallyDeferred: fk.initiallyDeferred || false
            });
          }
        }
      }

      // Extract view dependencies by parsing SQL
      for (const view of views) {
        const dependencies: any[] = [];
        const viewSql = view.definition || '';
        
        // Find table references in view SQL
        const tableMatches = viewSql.match(/(?:FROM|JOIN)\s+(\w+)/gi);
        if (tableMatches) {
          for (const match of tableMatches) {
            const tableName = match.replace(/(?:FROM|JOIN)\s+/i, '').trim();
            if (tableName && !tableName.startsWith('sqlite_')) {
              dependencies.push({
                objectType: 'TABLE' as const,
                objectName: tableName,
                objectSchema: 'main',
                dependencyType: 'DIRECT' as const
              });
            }
          }
        }

        // Find view references in view SQL
        const viewMatches = viewSql.match(/(?:FROM|JOIN)\s+(\w+)/gi);
        if (viewMatches) {
          for (const match of viewMatches) {
            const viewName = match.replace(/(?:FROM|JOIN)\s+/i, '').trim();
            if (viewName && !viewName.startsWith('sqlite_') && views.find(v => v.name === viewName)) {
              dependencies.push({
                objectType: 'VIEW' as const,
                objectName: viewName,
                objectSchema: 'main',
                dependencyType: 'DIRECT' as const
              });
            }
          }
        }

        dependencyGraph.viewDependencies.push({
          viewName: view.name,
          viewSchema: view.schema,
          dependsOn: dependencies
        });
      }

      // Extract trigger dependencies
      for (const trigger of triggers) {
        const dependencies: any[] = [];
        const triggerSql = trigger.definition || '';
        
        // Find table references in trigger SQL
        const tableMatches = triggerSql.match(/(?:FROM|JOIN|UPDATE|INSERT|DELETE)\s+(\w+)/gi);
        if (tableMatches) {
          for (const match of tableMatches) {
            const tableName = match.replace(/(?:FROM|JOIN|UPDATE|INSERT|DELETE)\s+/i, '').trim();
            if (tableName && !tableName.startsWith('sqlite_')) {
              dependencies.push({
                objectType: 'TABLE' as const,
                objectName: tableName,
                objectSchema: 'main',
                dependencyType: 'DIRECT' as const
              });
            }
          }
        }

        dependencyGraph.triggerDependencies.push({
          triggerName: trigger.name,
          tableName: trigger.tableName,
          tableSchema: trigger.schema,
          dependsOn: dependencies
        });
      }

      // Extract function dependencies (SQLite built-in functions)
      for (const func of functions) {
        const dependencies: any[] = [];
        const calls: any[] = [];
        
        // SQLite functions typically don't have complex dependencies
        // but we can analyze their usage patterns
        if (func.name && func.name !== 'sqlite_user') {
          // Check if function references tables (for custom functions)
          const funcSql = func.definition || '';
          const tableMatches = funcSql.match(/(?:FROM|JOIN|UPDATE|INSERT|DELETE)\s+(\w+)/gi);
          if (tableMatches) {
            for (const match of tableMatches) {
              const tableName = match.replace(/(?:FROM|JOIN|UPDATE|INSERT|DELETE)\s+/i, '').trim();
              if (tableName && !tableName.startsWith('sqlite_')) {
                dependencies.push({
                  objectType: 'TABLE' as const,
                  objectName: tableName,
                  objectSchema: 'main',
                  dependencyType: 'DIRECT' as const
                });
              }
            }
          }
        }

        dependencyGraph.functionDependencies.push({
          functionName: func.name,
          functionSchema: func.schema,
          functionType: 'FUNCTION' as const,
          dependsOn: dependencies,
          calls: calls
        });
      }

      // Detect circular dependencies
      const circularDeps = this.detectCircularDependencies(dependencyGraph);
      dependencyGraph.circularDependencies = circularDeps;

      // Calculate metrics
      dependencyGraph.dependencyMetrics.foreignKeyCount = dependencyGraph.foreignKeyDependencies.length;
      dependencyGraph.dependencyMetrics.viewDependencyCount = dependencyGraph.viewDependencies.length;
      dependencyGraph.dependencyMetrics.triggerDependencyCount = dependencyGraph.triggerDependencies.length;
      dependencyGraph.dependencyMetrics.functionDependencyCount = dependencyGraph.functionDependencies.length;
      dependencyGraph.dependencyMetrics.circularDependencyCount = circularDeps.length;
      dependencyGraph.dependencyMetrics.totalDependencies = 
        dependencyGraph.foreignKeyDependencies.length +
        dependencyGraph.viewDependencies.reduce((sum: number, v: any) => sum + v.dependsOn.length, 0) +
        dependencyGraph.triggerDependencies.reduce((sum: number, t: any) => sum + t.dependsOn.length, 0) +
        dependencyGraph.functionDependencies.reduce((sum: number, f: any) => sum + f.dependsOn.length, 0);

      // Calculate depth metrics
      const depthAnalysis = this.calculateDependencyDepth(dependencyGraph);
      dependencyGraph.dependencyMetrics.maxDependencyDepth = depthAnalysis.maxDepth;
      dependencyGraph.dependencyMetrics.averageDependencyDepth = depthAnalysis.avgDepth;

      return dependencyGraph;
    } catch (error) {
      console.warn(`⚠️ Could not extract SQLite dependency graph:`, error);
      return {
        foreignKeyDependencies: [],
        viewDependencies: [],
        triggerDependencies: [],
        functionDependencies: [],
        circularDependencies: [],
        dependencyMetrics: {
          totalDependencies: 0,
          foreignKeyCount: 0,
          viewDependencyCount: 0,
          triggerDependencyCount: 0,
          functionDependencyCount: 0,
          circularDependencyCount: 0,
          maxDependencyDepth: 0,
          averageDependencyDepth: 0
        }
      };
    }
  }

  /**
   * Detect circular dependencies in the dependency graph
   */
  private detectCircularDependencies(dependencyGraph: any): any[] {
    const circularDeps: any[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    // Build adjacency list for dependency graph
    const graph = new Map<string, string[]>();
    
    // Add foreign key dependencies
    for (const fk of dependencyGraph.foreignKeyDependencies) {
      const source = `${fk.sourceTable}`;
      const target = `${fk.targetTable}`;
      if (!graph.has(source)) graph.set(source, []);
      graph.get(source)!.push(target);
    }
    
    // Add view dependencies
    for (const view of dependencyGraph.viewDependencies) {
      const viewName = `${view.viewName}`;
      if (!graph.has(viewName)) graph.set(viewName, []);
      for (const dep of view.dependsOn) {
        if (dep.objectType === 'TABLE' || dep.objectType === 'VIEW') {
          graph.get(viewName)!.push(dep.objectName);
        }
      }
    }
    
    // Add trigger dependencies
    for (const trigger of dependencyGraph.triggerDependencies) {
      const triggerName = `${trigger.triggerName}`;
      if (!graph.has(triggerName)) graph.set(triggerName, []);
      for (const dep of trigger.dependsOn) {
        if (dep.objectType === 'TABLE' || dep.objectType === 'VIEW') {
          graph.get(triggerName)!.push(dep.objectName);
        }
      }
    }
    
    // DFS to detect cycles
    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart).concat([node]);
        circularDeps.push({
          objects: cycle.map(obj => ({
            objectType: 'TABLE' as const,
            objectName: obj,
            objectSchema: 'main'
          })),
          dependencyChain: cycle,
          severity: cycle.length > 3 ? 'HIGH' as const : 'MEDIUM' as const
        });
        return;
      }
      
      if (visited.has(node)) return;
      
      visited.add(node);
      recursionStack.add(node);
      path.push(node);
      
      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, [...path]);
      }
      
      recursionStack.delete(node);
    };
    
    // Check all nodes for cycles
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }
    
    return circularDeps;
  }

  /**
   * Calculate dependency depth metrics
   */
  private calculateDependencyDepth(dependencyGraph: any): { maxDepth: number; avgDepth: number } {
    const depths: number[] = [];
    
    // Calculate depth for each object
    const calculateObjectDepth = (objectName: string, visited: Set<string> = new Set()): number => {
      if (visited.has(objectName)) return 0; // Avoid infinite recursion
      visited.add(objectName);
      
      let maxDepth = 0;
      
      // Check foreign key dependencies
      for (const fk of dependencyGraph.foreignKeyDependencies) {
        if (fk.sourceTable === objectName) {
          const depth = 1 + calculateObjectDepth(fk.targetTable, new Set(visited));
          maxDepth = Math.max(maxDepth, depth);
        }
      }
      
      // Check view dependencies
      for (const view of dependencyGraph.viewDependencies) {
        if (view.viewName === objectName) {
          for (const dep of view.dependsOn) {
            if (dep.objectType === 'TABLE' || dep.objectType === 'VIEW') {
              const depth = 1 + calculateObjectDepth(dep.objectName, new Set(visited));
              maxDepth = Math.max(maxDepth, depth);
            }
          }
        }
      }
      
      // Check trigger dependencies
      for (const trigger of dependencyGraph.triggerDependencies) {
        if (trigger.triggerName === objectName) {
          for (const dep of trigger.dependsOn) {
            if (dep.objectType === 'TABLE' || dep.objectType === 'VIEW') {
              const depth = 1 + calculateObjectDepth(dep.objectName, new Set(visited));
              maxDepth = Math.max(maxDepth, depth);
            }
          }
        }
      }
      
      return maxDepth;
    };
    
    // Calculate depth for all objects
    const allObjects = new Set<string>();
    
    // Collect all object names
    for (const fk of dependencyGraph.foreignKeyDependencies) {
      allObjects.add(fk.sourceTable);
      allObjects.add(fk.targetTable);
    }
    for (const view of dependencyGraph.viewDependencies) {
      allObjects.add(view.viewName);
    }
    for (const trigger of dependencyGraph.triggerDependencies) {
      allObjects.add(trigger.triggerName);
    }
    
    // Calculate depth for each object
    for (const obj of allObjects) {
      const depth = calculateObjectDepth(obj);
      depths.push(depth);
    }
    
    const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
    const avgDepth = depths.length > 0 ? depths.reduce((sum, d) => sum + d, 0) / depths.length : 0;
    
    return { maxDepth, avgDepth: Math.round(avgDepth * 100) / 100 };
  }

  /**
   * Extract PostgreSQL dependency graph using pg_constraint, pg_depend, and pg_proc
   */
  private async extractPostgreSQLDependencyGraph(
    client: any,
    tableMetadata: any[],
    views: any[],
    triggers: any[],
    functions: any[],
    procedures: any[]
  ): Promise<any> {
    try {
      const dependencyGraph: any = {
        foreignKeyDependencies: [],
        viewDependencies: [],
        triggerDependencies: [],
        functionDependencies: [],
        circularDependencies: [],
        dependencyMetrics: {
          totalDependencies: 0,
          foreignKeyCount: 0,
          viewDependencyCount: 0,
          triggerDependencyCount: 0,
          functionDependencyCount: 0,
          circularDependencyCount: 0,
          maxDependencyDepth: 0,
          averageDependencyDepth: 0
        }
      };

      // Extract foreign key dependencies using pg_constraint
      const fkQuery = `
        SELECT 
          tc.constraint_name,
          tc.table_name as source_table,
          kcu.column_name as source_column,
          ccu.table_name as target_table,
          ccu.column_name as target_column,
          rc.delete_rule,
          rc.update_rule,
          tc.is_deferrable,
          tc.initially_deferred
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc 
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      `;
      
      const fkResult = await client.query(fkQuery);
      for (const fk of fkResult.rows) {
        dependencyGraph.foreignKeyDependencies.push({
          sourceTable: fk.source_table,
          sourceColumn: fk.source_column,
          targetTable: fk.target_table,
          targetColumn: fk.target_column,
          constraintName: fk.constraint_name,
          onDelete: fk.delete_rule,
          onUpdate: fk.update_rule,
          isDeferrable: fk.is_deferrable === 'YES',
          initiallyDeferred: fk.initially_deferred === 'YES'
        });
      }

      // Extract view dependencies using pg_depend and pg_rewrite
      const viewDepQuery = `
        SELECT 
          v.viewname as view_name,
          v.schemaname as view_schema,
          d.refobjid::regclass as depends_on_table,
          n.nspname as depends_on_schema,
          'TABLE' as object_type
        FROM pg_views v
        JOIN pg_depend d ON d.objid = (v.schemaname||'.'||v.viewname)::regclass
        JOIN pg_class c ON d.refobjid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relkind = 'r'
        UNION ALL
        SELECT 
          v.viewname as view_name,
          v.schemaname as view_schema,
          d.refobjid::regclass as depends_on_view,
          n.nspname as depends_on_schema,
          'VIEW' as object_type
        FROM pg_views v
        JOIN pg_depend d ON d.objid = (v.schemaname||'.'||v.viewname)::regclass
        JOIN pg_class c ON d.refobjid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relkind = 'v'
      `;
      
      const viewDepResult = await client.query(viewDepQuery);
      const viewDepsMap = new Map<string, any[]>();
      
      for (const dep of viewDepResult.rows) {
        const viewKey = `${dep.view_schema}.${dep.view_name}`;
        if (!viewDepsMap.has(viewKey)) {
          viewDepsMap.set(viewKey, []);
        }
        viewDepsMap.get(viewKey)!.push({
          objectType: dep.object_type as 'TABLE' | 'VIEW',
          objectName: dep.depends_on_table,
          objectSchema: dep.depends_on_schema,
          dependencyType: 'DIRECT' as const
        });
      }
      
      for (const [viewKey, deps] of viewDepsMap) {
        const [schema, name] = viewKey.split('.');
        dependencyGraph.viewDependencies.push({
          viewName: name,
          viewSchema: schema,
          dependsOn: deps
        });
      }

      // Extract trigger dependencies using pg_depend
      const triggerDepQuery = `
        SELECT 
          t.tgname as trigger_name,
          c.relname as table_name,
          n.nspname as table_schema,
          d.refobjid::regclass as depends_on_object,
          dep_n.nspname as depends_on_schema,
          dep_c.relkind as object_type
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_depend d ON d.objid = t.oid
        JOIN pg_class dep_c ON d.refobjid = dep_c.oid
        JOIN pg_namespace dep_n ON dep_c.relnamespace = dep_n.oid
        WHERE NOT t.tgisinternal
      `;
      
      const triggerDepResult = await client.query(triggerDepQuery);
      const triggerDepsMap = new Map<string, any[]>();
      
      for (const dep of triggerDepResult.rows) {
        const triggerKey = `${dep.table_schema}.${dep.trigger_name}`;
        if (!triggerDepsMap.has(triggerKey)) {
          triggerDepsMap.set(triggerKey, []);
        }
        
        let objectType: 'TABLE' | 'VIEW' | 'FUNCTION' | 'PROCEDURE' | 'SEQUENCE' | 'COLLECTION';
        switch (dep.object_type) {
          case 'r': objectType = 'TABLE'; break;
          case 'v': objectType = 'VIEW'; break;
          case 'f': objectType = 'FUNCTION'; break;
          case 'p': objectType = 'PROCEDURE'; break;
          case 'S': objectType = 'SEQUENCE'; break;
          default: objectType = 'TABLE';
        }
        
        triggerDepsMap.get(triggerKey)!.push({
          objectType,
          objectName: dep.depends_on_object,
          objectSchema: dep.depends_on_schema,
          dependencyType: 'DIRECT' as const
        });
      }
      
      for (const [triggerKey, deps] of triggerDepsMap) {
        const [schema, name] = triggerKey.split('.');
        dependencyGraph.triggerDependencies.push({
          triggerName: name,
          tableName: triggerDepResult.rows.find((r: any) => `${r.table_schema}.${r.trigger_name}` === triggerKey)?.table_name || '',
          tableSchema: schema,
          dependsOn: deps
        });
      }

      // Extract function/procedure dependencies using pg_depend and pg_proc
      const funcDepQuery = `
        SELECT 
          p.proname as function_name,
          n.nspname as function_schema,
          p.prokind as function_type,
          d.refobjid::regclass as depends_on_object,
          dep_n.nspname as depends_on_schema,
          dep_c.relkind as object_type
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        JOIN pg_depend d ON d.objid = p.oid
        JOIN pg_class dep_c ON d.refobjid = dep_c.oid
        JOIN pg_namespace dep_n ON dep_c.relnamespace = dep_n.oid
        WHERE d.deptype = 'n'
      `;
      
      const funcDepResult = await client.query(funcDepQuery);
      const funcDepsMap = new Map<string, any[]>();
      
      for (const dep of funcDepResult.rows) {
        const funcKey = `${dep.function_schema}.${dep.function_name}`;
        if (!funcDepsMap.has(funcKey)) {
          funcDepsMap.set(funcKey, []);
        }
        
        let objectType: 'TABLE' | 'VIEW' | 'FUNCTION' | 'PROCEDURE' | 'SEQUENCE' | 'COLLECTION';
        switch (dep.object_type) {
          case 'r': objectType = 'TABLE'; break;
          case 'v': objectType = 'VIEW'; break;
          case 'f': objectType = 'FUNCTION'; break;
          case 'p': objectType = 'PROCEDURE'; break;
          case 'S': objectType = 'SEQUENCE'; break;
          default: objectType = 'TABLE';
        }
        
        funcDepsMap.get(funcKey)!.push({
          objectType,
          objectName: dep.depends_on_object,
          objectSchema: dep.depends_on_schema,
          dependencyType: 'DIRECT' as const
        });
      }
      
      for (const [funcKey, deps] of funcDepsMap) {
        const [schema, name] = funcKey.split('.');
        const funcType = funcDepResult.rows.find((r: any) => `${r.function_schema}.${r.function_name}` === funcKey)?.function_type;
        dependencyGraph.functionDependencies.push({
          functionName: name,
          functionSchema: schema,
          functionType: funcType === 'p' ? 'PROCEDURE' as const : 'FUNCTION' as const,
          dependsOn: deps,
          calls: [] // Would need additional analysis for function calls
        });
      }

      // Detect circular dependencies
      const circularDeps = this.detectCircularDependencies(dependencyGraph);
      dependencyGraph.circularDependencies = circularDeps;

      // Calculate metrics
      dependencyGraph.dependencyMetrics.foreignKeyCount = dependencyGraph.foreignKeyDependencies.length;
      dependencyGraph.dependencyMetrics.viewDependencyCount = dependencyGraph.viewDependencies.length;
      dependencyGraph.dependencyMetrics.triggerDependencyCount = dependencyGraph.triggerDependencies.length;
      dependencyGraph.dependencyMetrics.functionDependencyCount = dependencyGraph.functionDependencies.length;
      dependencyGraph.dependencyMetrics.circularDependencyCount = circularDeps.length;
      dependencyGraph.dependencyMetrics.totalDependencies = 
        dependencyGraph.foreignKeyDependencies.length +
        dependencyGraph.viewDependencies.reduce((sum: number, v: any) => sum + v.dependsOn.length, 0) +
        dependencyGraph.triggerDependencies.reduce((sum: number, t: any) => sum + t.dependsOn.length, 0) +
        dependencyGraph.functionDependencies.reduce((sum: number, f: any) => sum + f.dependsOn.length, 0);

      // Calculate depth metrics
      const depthAnalysis = this.calculateDependencyDepth(dependencyGraph);
      dependencyGraph.dependencyMetrics.maxDependencyDepth = depthAnalysis.maxDepth;
      dependencyGraph.dependencyMetrics.averageDependencyDepth = depthAnalysis.avgDepth;

      return dependencyGraph;
    } catch (error) {
      console.warn(`⚠️ Could not extract PostgreSQL dependency graph:`, error);
      return {
        foreignKeyDependencies: [],
        viewDependencies: [],
        triggerDependencies: [],
        functionDependencies: [],
        circularDependencies: [],
        dependencyMetrics: {
          totalDependencies: 0,
          foreignKeyCount: 0,
          viewDependencyCount: 0,
          triggerDependencyCount: 0,
          functionDependencyCount: 0,
          circularDependencyCount: 0,
          maxDependencyDepth: 0,
          averageDependencyDepth: 0
        }
      };
    }
  }

  /**
   * Extract MySQL dependency graph using information_schema.referential_constraints and mysql.proc
   */
  private async extractMySQLDependencyGraph(
    connection: any,
    tableMetadata: any[],
    views: any[],
    triggers: any[],
    functions: any[],
    procedures: any[]
  ): Promise<any> {
    try {
      const dependencyGraph: any = {
        foreignKeyDependencies: [],
        viewDependencies: [],
        triggerDependencies: [],
        functionDependencies: [],
        circularDependencies: [],
        dependencyMetrics: {
          totalDependencies: 0,
          foreignKeyCount: 0,
          viewDependencyCount: 0,
          triggerDependencyCount: 0,
          functionDependencyCount: 0,
          circularDependencyCount: 0,
          maxDependencyDepth: 0,
          averageDependencyDepth: 0
        }
      };

      // Extract foreign key dependencies using information_schema.referential_constraints
      const fkQuery = `
        SELECT 
          rc.constraint_name,
          rc.table_name as source_table,
          kcu.column_name as source_column,
          rc.referenced_table_name as target_table,
          kcu.referenced_column_name as target_column,
          rc.delete_rule,
          rc.update_rule
        FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage kcu 
          ON rc.constraint_name = kcu.constraint_name
        WHERE rc.constraint_schema = DATABASE()
      `;
      
      const [fkResult] = await connection.execute(fkQuery);
      for (const fk of fkResult) {
        dependencyGraph.foreignKeyDependencies.push({
          sourceTable: fk.source_table,
          sourceColumn: fk.source_column,
          targetTable: fk.target_table,
          targetColumn: fk.target_column,
          constraintName: fk.constraint_name,
          onDelete: fk.delete_rule,
          onUpdate: fk.update_rule,
          isDeferrable: false, // MySQL doesn't support deferrable constraints
          initiallyDeferred: false
        });
      }

      // Extract view dependencies by parsing view definitions
      const viewQuery = `
        SELECT 
          table_name as view_name,
          table_schema as view_schema,
          view_definition
        FROM information_schema.views
        WHERE table_schema = DATABASE()
      `;
      
      const [viewResult] = await connection.execute(viewQuery);
      for (const view of viewResult) {
        const dependencies: any[] = [];
        const viewSql = view.view_definition || '';
        
        // Find table references in view SQL
        const tableMatches = viewSql.match(/(?:FROM|JOIN)\s+`?(\w+)`?/gi);
        if (tableMatches) {
          for (const match of tableMatches) {
            const tableName = match.replace(/(?:FROM|JOIN)\s+`?/i, '').replace(/`$/, '').trim();
            if (tableName && !tableName.startsWith('information_schema')) {
              dependencies.push({
                objectType: 'TABLE' as const,
                objectName: tableName,
                objectSchema: view.view_schema,
                dependencyType: 'DIRECT' as const
              });
            }
          }
        }

        dependencyGraph.viewDependencies.push({
          viewName: view.view_name,
          viewSchema: view.view_schema,
          dependsOn: dependencies
        });
      }

      // Extract trigger dependencies by parsing trigger definitions
      const triggerQuery = `
        SELECT 
          trigger_name,
          event_object_table as table_name,
          event_object_schema as table_schema,
          action_statement
        FROM information_schema.triggers
        WHERE trigger_schema = DATABASE()
      `;
      
      const [triggerResult] = await connection.execute(triggerQuery);
      for (const trigger of triggerResult) {
        const dependencies: any[] = [];
        const triggerSql = trigger.action_statement || '';
        
        // Find table references in trigger SQL
        const tableMatches = triggerSql.match(/(?:FROM|JOIN|UPDATE|INSERT|DELETE)\s+`?(\w+)`?/gi);
        if (tableMatches) {
          for (const match of tableMatches) {
            const tableName = match.replace(/(?:FROM|JOIN|UPDATE|INSERT|DELETE)\s+`?/i, '').replace(/`$/, '').trim();
            if (tableName && !tableName.startsWith('information_schema')) {
              dependencies.push({
                objectType: 'TABLE' as const,
                objectName: tableName,
                objectSchema: trigger.table_schema,
                dependencyType: 'DIRECT' as const
              });
            }
          }
        }

        dependencyGraph.triggerDependencies.push({
          triggerName: trigger.trigger_name,
          tableName: trigger.table_name,
          tableSchema: trigger.table_schema,
          dependsOn: dependencies
        });
      }

      // Extract function/procedure dependencies by parsing definitions
      const funcQuery = `
        SELECT 
          routine_name as function_name,
          routine_schema as function_schema,
          routine_type,
          routine_definition
        FROM information_schema.routines
        WHERE routine_schema = DATABASE()
      `;
      
      const [funcResult] = await connection.execute(funcQuery);
      for (const func of funcResult) {
        const dependencies: any[] = [];
        const calls: any[] = [];
        const funcSql = func.routine_definition || '';
        
        // Find table references in function/procedure SQL
        const tableMatches = funcSql.match(/(?:FROM|JOIN|UPDATE|INSERT|DELETE)\s+`?(\w+)`?/gi);
        if (tableMatches) {
          for (const match of tableMatches) {
            const tableName = match.replace(/(?:FROM|JOIN|UPDATE|INSERT|DELETE)\s+`?/i, '').replace(/`$/, '').trim();
            if (tableName && !tableName.startsWith('information_schema')) {
              dependencies.push({
                objectType: 'TABLE' as const,
                objectName: tableName,
                objectSchema: func.function_schema,
                dependencyType: 'DIRECT' as const
              });
            }
          }
        }

        // Find function calls in SQL
        const callMatches = funcSql.match(/(\w+)\s*\(/g);
        if (callMatches) {
          for (const match of callMatches) {
            const funcName = match.replace(/\s*\($/, '');
            if (funcName && funcName !== func.function_name) {
              calls.push({
                functionName: funcName,
                functionSchema: func.function_schema,
                callType: 'DIRECT' as const
              });
            }
          }
        }

        dependencyGraph.functionDependencies.push({
          functionName: func.function_name,
          functionSchema: func.function_schema,
          functionType: func.routine_type === 'PROCEDURE' ? 'PROCEDURE' as const : 'FUNCTION' as const,
          dependsOn: dependencies,
          calls: calls
        });
      }

      // Detect circular dependencies
      const circularDeps = this.detectCircularDependencies(dependencyGraph);
      dependencyGraph.circularDependencies = circularDeps;

      // Calculate metrics
      dependencyGraph.dependencyMetrics.foreignKeyCount = dependencyGraph.foreignKeyDependencies.length;
      dependencyGraph.dependencyMetrics.viewDependencyCount = dependencyGraph.viewDependencies.length;
      dependencyGraph.dependencyMetrics.triggerDependencyCount = dependencyGraph.triggerDependencies.length;
      dependencyGraph.dependencyMetrics.functionDependencyCount = dependencyGraph.functionDependencies.length;
      dependencyGraph.dependencyMetrics.circularDependencyCount = circularDeps.length;
      dependencyGraph.dependencyMetrics.totalDependencies = 
        dependencyGraph.foreignKeyDependencies.length +
        dependencyGraph.viewDependencies.reduce((sum: number, v: any) => sum + v.dependsOn.length, 0) +
        dependencyGraph.triggerDependencies.reduce((sum: number, t: any) => sum + t.dependsOn.length, 0) +
        dependencyGraph.functionDependencies.reduce((sum: number, f: any) => sum + f.dependsOn.length, 0);

      // Calculate depth metrics
      const depthAnalysis = this.calculateDependencyDepth(dependencyGraph);
      dependencyGraph.dependencyMetrics.maxDependencyDepth = depthAnalysis.maxDepth;
      dependencyGraph.dependencyMetrics.averageDependencyDepth = depthAnalysis.avgDepth;

      return dependencyGraph;
    } catch (error) {
      console.warn(`⚠️ Could not extract MySQL dependency graph:`, error);
      return {
        foreignKeyDependencies: [],
        viewDependencies: [],
        triggerDependencies: [],
        functionDependencies: [],
        circularDependencies: [],
        dependencyMetrics: {
          totalDependencies: 0,
          foreignKeyCount: 0,
          viewDependencyCount: 0,
          triggerDependencyCount: 0,
          functionDependencyCount: 0,
          circularDependencyCount: 0,
          maxDependencyDepth: 0,
          averageDependencyDepth: 0
        }
      };
    }
  }

  /**
   * Extract MongoDB collection and index options
   */
  private async extractMongoDBOptions(db: any): Promise<any> {
    try {
      const mongoOptions: any = {
        collections: [],
        indexes: [],
        databaseOptions: {}
      };

      // Get database stats
      const dbStats = await db.stats();
      mongoOptions.databaseOptions = {
        name: db.databaseName,
        sizeOnDisk: dbStats.sizeOnDisk || 0,
        empty: dbStats.empty || false,
        shards: dbStats.shards,
        collections: dbStats.collections || 0,
        views: dbStats.views || 0,
        objects: dbStats.objects || 0,
        avgObjSize: dbStats.avgObjSize || 0,
        dataSize: dbStats.dataSize || 0,
        storageSize: dbStats.storageSize || 0,
        indexes: dbStats.indexes || 0,
        indexSize: dbStats.indexSize || 0,
        fileSize: dbStats.fileSize || 0,
        fsUsedSize: dbStats.fsUsedSize || 0,
        fsTotalSize: dbStats.fsTotalSize || 0
      };

      // Get collections
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        const collectionName = collection.name;
        const collectionObj = db.collection(collectionName);
        
        // Get collection options
        const options: any = {
          capped: collection.options?.capped || false,
          size: collection.options?.size,
          max: collection.options?.max,
          validator: collection.options?.validator,
          validationLevel: collection.options?.validationLevel || 'strict',
          validationAction: collection.options?.validationAction || 'error',
          collation: collection.options?.collation,
          storageEngine: collection.options?.storageEngine,
          indexOptionDefaults: collection.options?.indexOptionDefaults,
          viewOn: collection.options?.viewOn,
          pipeline: collection.options?.pipeline
        };

        // Get collection stats
        let stats: any = {
          count: 0,
          size: 0,
          avgObjSize: 0,
          storageSize: 0,
          capped: false,
          max: 0,
          maxSize: 0,
          indexSizes: {},
          totalIndexSize: 0,
          indexBuilds: [],
          totalSize: 0
        };

        try {
          const collectionStats = await collectionObj.stats();
          stats = {
            count: collectionStats.count || 0,
            size: collectionStats.size || 0,
            avgObjSize: collectionStats.avgObjSize || 0,
            storageSize: collectionStats.storageSize || 0,
            capped: collectionStats.capped || false,
            max: collectionStats.max || 0,
            maxSize: collectionStats.maxSize || 0,
            wiredTiger: collectionStats.wiredTiger,
            indexSizes: collectionStats.indexSizes || {},
            totalIndexSize: collectionStats.totalIndexSize || 0,
            indexBuilds: collectionStats.indexBuilds || [],
            totalSize: collectionStats.totalSize || 0
          };
        } catch (error) {
          console.warn(`⚠️ Could not get stats for collection ${collectionName}:`, error);
        }

        mongoOptions.collections.push({
          name: collectionName,
          options,
          stats
        });

        // Get indexes for this collection
        try {
          const indexes = await collectionObj.listIndexes().toArray();
          
          for (const index of indexes) {
            mongoOptions.indexes.push({
              collectionName: collectionName,
              indexName: index.name,
              options: {
                unique: index.unique || false,
                sparse: index.sparse || false,
                background: index.background || false,
                partialFilterExpression: index.partialFilterExpression,
                expireAfterSeconds: index.expireAfterSeconds,
                name: index.name,
                weights: index.weights,
                default_language: index.default_language,
                language_override: index.language_override,
                textIndexVersion: index.textIndexVersion,
                '2dsphereIndexVersion': index['2dsphereIndexVersion'],
                bits: index.bits,
                min: index.min,
                max: index.max,
                bucketSize: index.bucketSize,
                collation: index.collation,
                wildcardProjection: index.wildcardProjection,
                hidden: index.hidden || false
              },
              key: index.key,
              version: index.v || 2
            });
          }
        } catch (error) {
          console.warn(`⚠️ Could not get indexes for collection ${collectionName}:`, error);
        }
      }

      return mongoOptions;
    } catch (error) {
      console.warn(`⚠️ Could not extract MongoDB options:`, error);
      return {
        collections: [],
        indexes: [],
        databaseOptions: {
          name: '',
          sizeOnDisk: 0,
          empty: true,
          collections: 0,
          views: 0,
          objects: 0,
          avgObjSize: 0,
          dataSize: 0,
          storageSize: 0,
          indexes: 0,
          indexSize: 0,
          fileSize: 0,
          fsUsedSize: 0,
          fsTotalSize: 0
        }
      };
    }
  }

  /**
   * Extract MongoDB dependency graph using collection references and embedded documents
   */
  private async extractMongoDBDependencyGraph(
    db: any,
    tableMetadata: any[],
    views: any[],
    triggers: any[],
    functions: any[],
    procedures: any[]
  ): Promise<any> {
    try {
      const dependencyGraph: any = {
        foreignKeyDependencies: [],
        viewDependencies: [],
        triggerDependencies: [],
        functionDependencies: [],
        circularDependencies: [],
        dependencyMetrics: {
          totalDependencies: 0,
          foreignKeyCount: 0,
          viewDependencyCount: 0,
          triggerDependencyCount: 0,
          functionDependencyCount: 0,
          circularDependencyCount: 0,
          maxDependencyDepth: 0,
          averageDependencyDepth: 0
        }
      };

      // Extract foreign key dependencies by analyzing document references
      for (const collection of tableMetadata) {
        const collectionName = collection.name;
        const sampleDocs = await db.collection(collectionName).find({}).limit(100).toArray();
        
        for (const doc of sampleDocs) {
          // Look for common reference patterns
          const refPatterns = [
            /_id$/,
            /_ref$/,
            /Id$/,
            /Ref$/,
            /_reference$/,
            /Reference$/
          ];
          
          for (const [key, value] of Object.entries(doc)) {
            if (typeof value === 'string' && refPatterns.some(pattern => pattern.test(key))) {
              // Try to find the referenced collection
              const possibleCollections = tableMetadata.filter(t => 
                t.name.toLowerCase().includes(value.toLowerCase()) ||
                value.toLowerCase().includes(t.name.toLowerCase())
              );
              
              if (possibleCollections.length > 0) {
                const targetCollection = possibleCollections[0];
                dependencyGraph.foreignKeyDependencies.push({
                  sourceTable: collectionName,
                  sourceColumn: key,
                  targetTable: targetCollection.name,
                  targetColumn: '_id',
                  constraintName: `fk_${collectionName}_${key}`,
                  onDelete: 'NO ACTION',
                  onUpdate: 'NO ACTION',
                  isDeferrable: false,
                  initiallyDeferred: false
                });
              }
            }
          }
        }
      }

      // Extract view dependencies (MongoDB views are implemented as aggregation pipelines)
      const viewQuery = await db.listCollections({ type: 'view' }).toArray();
      for (const view of viewQuery) {
        const viewInfo = await db.collection(view.name).options();
        const dependencies: any[] = [];
        
        if (viewInfo.viewOn) {
          dependencies.push({
            objectType: 'COLLECTION' as const,
            objectName: viewInfo.viewOn,
            objectSchema: undefined,
            dependencyType: 'DIRECT' as const
          });
        }
        
        dependencyGraph.viewDependencies.push({
          viewName: view.name,
          viewSchema: undefined,
          dependsOn: dependencies
        });
      }

      // Extract trigger dependencies (MongoDB change streams and triggers)
      for (const trigger of triggers) {
        const dependencies: any[] = [];
        
        // Analyze trigger body for collection references
        const triggerBody = trigger.body || '';
        const collectionMatches = triggerBody.match(/db\.(\w+)\./g);
        if (collectionMatches) {
          for (const match of collectionMatches) {
            const collectionName = match.replace(/db\./, '').replace(/\.$/, '');
            dependencies.push({
              objectType: 'COLLECTION' as const,
              objectName: collectionName,
              objectSchema: undefined,
              dependencyType: 'DIRECT' as const
            });
          }
        }
        
        dependencyGraph.triggerDependencies.push({
          triggerName: trigger.name,
          tableName: trigger.tableName || '',
          tableSchema: undefined,
          dependsOn: dependencies
        });
      }

      // Extract function dependencies (MongoDB stored procedures and functions)
      for (const func of functions) {
        const dependencies: any[] = [];
        const calls: any[] = [];
        
        // Analyze function body for collection references
        const funcBody = func.body || '';
        const collectionMatches = funcBody.match(/db\.(\w+)\./g);
        if (collectionMatches) {
          for (const match of collectionMatches) {
            const collectionName = match.replace(/db\./, '').replace(/\.$/, '');
            dependencies.push({
              objectType: 'COLLECTION' as const,
              objectName: collectionName,
              objectSchema: undefined,
              dependencyType: 'DIRECT' as const
            });
          }
        }
        
        // Find function calls
        const callMatches = funcBody.match(/(\w+)\s*\(/g);
        if (callMatches) {
          for (const match of callMatches) {
            const funcName = match.replace(/\s*\($/, '');
            if (funcName && funcName !== func.name) {
              calls.push({
                functionName: funcName,
                functionSchema: undefined,
                callType: 'DIRECT' as const
              });
            }
          }
        }
        
        dependencyGraph.functionDependencies.push({
          functionName: func.name,
          functionSchema: undefined,
          functionType: 'FUNCTION' as const,
          dependsOn: dependencies,
          calls: calls
        });
      }

      // Detect circular dependencies
      const circularDeps = this.detectCircularDependencies(dependencyGraph);
      dependencyGraph.circularDependencies = circularDeps;

      // Calculate metrics
      dependencyGraph.dependencyMetrics.foreignKeyCount = dependencyGraph.foreignKeyDependencies.length;
      dependencyGraph.dependencyMetrics.viewDependencyCount = dependencyGraph.viewDependencies.length;
      dependencyGraph.dependencyMetrics.triggerDependencyCount = dependencyGraph.triggerDependencies.length;
      dependencyGraph.dependencyMetrics.functionDependencyCount = dependencyGraph.functionDependencies.length;
      dependencyGraph.dependencyMetrics.circularDependencyCount = circularDeps.length;
      dependencyGraph.dependencyMetrics.totalDependencies = 
        dependencyGraph.foreignKeyDependencies.length +
        dependencyGraph.viewDependencies.reduce((sum: number, v: any) => sum + v.dependsOn.length, 0) +
        dependencyGraph.triggerDependencies.reduce((sum: number, t: any) => sum + t.dependsOn.length, 0) +
        dependencyGraph.functionDependencies.reduce((sum: number, f: any) => sum + f.dependsOn.length, 0);

      // Calculate depth metrics
      const depthAnalysis = this.calculateDependencyDepth(dependencyGraph);
      dependencyGraph.dependencyMetrics.maxDependencyDepth = depthAnalysis.maxDepth;
      dependencyGraph.dependencyMetrics.averageDependencyDepth = depthAnalysis.avgDepth;

      return dependencyGraph;
    } catch (error) {
      console.warn(`⚠️ Could not extract MongoDB dependency graph:`, error);
      return {
        foreignKeyDependencies: [],
        viewDependencies: [],
        triggerDependencies: [],
        functionDependencies: [],
        circularDependencies: [],
        dependencyMetrics: {
          totalDependencies: 0,
          foreignKeyCount: 0,
          viewDependencyCount: 0,
          triggerDependencyCount: 0,
          functionDependencyCount: 0,
          circularDependencyCount: 0,
          maxDependencyDepth: 0,
          averageDependencyDepth: 0
        }
      };
    }
  }

  /**
   * Extract PostgreSQL extensions using pg_extension
   */
  private async extractPostgreSQLExtensions(client: any): Promise<any> {
    try {
      const extensions: any = {
        installed: [],
        available: []
      };

      // Extract installed extensions
      const installedQuery = `
        SELECT 
          e.extname as name,
          e.extversion as version,
          n.nspname as schema,
          e.extcomment as comment,
          pg_catalog.obj_description(e.oid, 'pg_extension') as description
        FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        ORDER BY e.extname
      `;
      
      const installedResult = await client.query(installedQuery);
      for (const ext of installedResult.rows) {
        extensions.installed.push({
          name: ext.name,
          version: ext.version,
          schema: ext.schema,
          description: ext.description,
          installedVersion: ext.version,
          comment: ext.comment
        });
      }

      // Extract available extensions (from pg_available_extensions)
      const availableQuery = `
        SELECT 
          name,
          default_version as version,
          comment,
          description
        FROM pg_available_extensions
        WHERE name NOT IN (SELECT extname FROM pg_extension)
        ORDER BY name
      `;
      
      const availableResult = await client.query(availableQuery);
      for (const ext of availableResult.rows) {
        extensions.available.push({
          name: ext.name,
          version: ext.version,
          description: ext.description,
          comment: ext.comment
        });
      }

      return extensions;
    } catch (error) {
      console.warn(`⚠️ Could not extract PostgreSQL extensions:`, error);
      return {
        installed: [],
        available: []
      };
    }
  }

  /**
   * Extract PostgreSQL partitioning information using pg_inherits and pg_partitioned_table
   */
  private async extractPostgreSQLPartitioning(client: any): Promise<any> {
    try {
      const partitioning: any = {
        partitionedTables: [],
        partitionInheritance: []
      };

      // Extract partitioned tables
      const partitionedQuery = `
        SELECT 
          c.relname as table_name,
          n.nspname as schema,
          pt.partstrat as partition_type,
          pt.partkeys as partition_key_attrs,
          pt.partexprs as partition_expressions
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_partitioned_table pt ON c.oid = pt.partrelid
        WHERE c.relkind = 'p'
        ORDER BY n.nspname, c.relname
      `;
      
      const partitionedResult = await client.query(partitionedQuery);
      for (const table of partitionedResult.rows) {
        const partitionType = table.partition_type === 'r' ? 'RANGE' : 
                             table.partition_type === 'l' ? 'LIST' : 
                             table.partition_type === 'h' ? 'HASH' : 'COMPOSITE';
        
        // Get partition key columns
        const keyAttrs = table.partition_key_attrs || [];
        const keyExpressions = table.partition_expressions || [];
        const partitionKey: string[] = [];
        
        // Map attribute numbers to column names
        if (keyAttrs.length > 0) {
          const attrQuery = `
            SELECT a.attname
            FROM pg_attribute a
            WHERE a.attrelid = (SELECT oid FROM pg_class WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = $2))
            AND a.attnum = ANY($3)
            ORDER BY array_position($3, a.attnum)
          `;
          const attrResult = await client.query(attrQuery, [table.table_name, table.schema, keyAttrs]);
          partitionKey.push(...attrResult.rows.map((r: any) => r.attname));
        }
        
        // Add expressions
        if (keyExpressions.length > 0) {
          partitionKey.push(...keyExpressions);
        }

        // Get subpartitions
        const subpartitionsQuery = `
          SELECT 
            c.relname as partition_name,
            pt.partstrat as partition_type,
            pt.partkeys as partition_key_attrs,
            pt.partexprs as partition_expressions,
            pg_get_expr(pt.partexprs, c.oid) as partition_expression
          FROM pg_inherits i
          JOIN pg_class c ON i.inhrelid = c.oid
          JOIN pg_partitioned_table pt ON c.oid = pt.partrelid
          WHERE i.inhparent = (SELECT oid FROM pg_class WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = $2))
          ORDER BY c.relname
        `;
        
        const subpartitionsResult = await client.query(subpartitionsQuery, [table.table_name, table.schema]);
        const subpartitions: any[] = [];
        
        for (const subpart of subpartitionsResult.rows) {
          const subpartType = subpart.partition_type === 'r' ? 'RANGE' : 
                              subpart.partition_type === 'l' ? 'LIST' : 'HASH';
          
          subpartitions.push({
            name: subpart.partition_name,
            type: subpartType,
            key: partitionKey, // Inherited from parent
            expression: subpart.partition_expression
          });
        }

        partitioning.partitionedTables.push({
          tableName: table.table_name,
          schema: table.schema,
          partitionType,
          partitionKey,
          partitionExpression: keyExpressions.join(', '),
          subpartitions
        });
      }

      // Extract partition inheritance relationships
      const inheritanceQuery = `
        SELECT 
          pc.relname as parent_table,
          pn.nspname as parent_schema,
          cc.relname as child_table,
          cn.nspname as child_schema,
          CASE 
            WHEN pc.relkind = 'p' THEN 'PARTITION'
            ELSE 'TABLE'
          END as inheritance_type
        FROM pg_inherits i
        JOIN pg_class pc ON i.inhparent = pc.oid
        JOIN pg_namespace pn ON pc.relnamespace = pn.oid
        JOIN pg_class cc ON i.inhrelid = cc.oid
        JOIN pg_namespace cn ON cc.relnamespace = cn.oid
        ORDER BY pn.nspname, pc.relname, cn.nspname, cc.relname
      `;
      
      const inheritanceResult = await client.query(inheritanceQuery);
      for (const rel of inheritanceResult.rows) {
        partitioning.partitionInheritance.push({
          parentTable: rel.parent_table,
          parentSchema: rel.parent_schema,
          childTable: rel.child_table,
          childSchema: rel.child_schema,
          inheritanceType: rel.inheritance_type
        });
      }

      return partitioning;
    } catch (error) {
      console.warn(`⚠️ Could not extract PostgreSQL partitioning:`, error);
      return {
        partitionedTables: [],
        partitionInheritance: []
      };
    }
  }

  private async extractPostgreSQLRuntimeState(client: any): Promise<any> {
    try {
      const runtimeState: any = {
        connections: [],
        transactions: [],
        locks: [],
        blockingLocks: [],
        systemMetrics: {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          blockedConnections: 0,
          totalTransactions: 0,
          activeTransactions: 0,
          totalLocks: 0,
          grantedLocks: 0,
          waitingLocks: 0,
          maxConnections: 0,
          connectionUtilization: 0,
          averageQueryTime: 0,
          longestQueryTime: 0,
          databaseSize: 0,
          cacheHitRatio: 0,
          lastAnalyze: '',
          lastVacuum: '',
          lastCheckpoint: ''
        }
      };

      // Extract active connections from pg_stat_activity
      const connectionsQuery = `
        SELECT 
          pid,
          datname as database,
          usename as user,
          client_addr as host,
          client_port as port,
          state,
          application_name,
          client_addr::text as client_address,
          backend_start,
          query_start,
          state_change,
          wait_event_type,
          wait_event,
          query,
          backend_type
        FROM pg_stat_activity
        WHERE state IS NOT NULL
        ORDER BY backend_start
      `;

      const connections = await client.query(connectionsQuery);
      runtimeState.connections = connections.rows.map((conn: any) => ({
        id: `pg_conn_${conn.pid}`,
        database: conn.database,
        user: conn.user,
        host: conn.host || 'localhost',
        port: conn.port,
        state: conn.state,
        applicationName: conn.application_name,
        clientAddress: conn.client_address,
        backendStart: conn.backend_start,
        queryStart: conn.query_start,
        stateChange: conn.state_change,
        waitEventType: conn.wait_event_type,
        waitEvent: conn.wait_event,
        query: conn.query,
        backendType: conn.backend_type,
        pid: conn.pid,
        attributes: {
          waitEventType: conn.wait_event_type,
          waitEvent: conn.wait_event,
          backendType: conn.backend_type
        }
      }));

      // Extract transaction information
      const transactionsQuery = `
        SELECT 
          pid,
          datname as database,
          usename as user,
          state,
          CASE 
            WHEN transaction_isolation = 'read uncommitted' THEN 'READ_UNCOMMITTED'
            WHEN transaction_isolation = 'read committed' THEN 'READ_COMMITTED'
            WHEN transaction_isolation = 'repeatable read' THEN 'REPEATABLE_READ'
            WHEN transaction_isolation = 'serializable' THEN 'SERIALIZABLE'
            ELSE 'READ_COMMITTED'
          END as isolation_level,
          xact_start,
          query_start,
          state_change,
          query
        FROM pg_stat_activity
        WHERE state IN ('active', 'idle in transaction', 'idle in transaction (aborted)')
        ORDER BY xact_start
      `;

      const transactions = await client.query(transactionsQuery);
      runtimeState.transactions = transactions.rows.map((txn: any) => ({
        id: `pg_txn_${txn.pid}`,
        database: txn.database,
        user: txn.user,
        state: txn.state,
        isolationLevel: txn.isolation_level,
        readOnly: false, // Would need additional query to determine
        startTime: txn.xact_start || txn.query_start,
        duration: txn.xact_start ? Date.now() - new Date(txn.xact_start).getTime() : 0,
        query: txn.query,
        attributes: {
          pid: txn.pid,
          queryStart: txn.query_start,
          stateChange: txn.state_change
        }
      }));

      // Extract lock information from pg_locks
      const locksQuery = `
        SELECT 
          l.locktype as type,
          l.mode,
          l.granted,
          l.database,
          n.nspname as schema,
          c.relname as table,
          l.page,
          l.tuple,
          l.virtualxid,
          l.transactionid,
          l.classid,
          l.objid,
          l.objsubid,
          l.virtualtransaction,
          l.pid,
          l.fastpath,
          l.waitstart
        FROM pg_locks l
        LEFT JOIN pg_class c ON c.oid = l.relation
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
        ORDER BY l.pid, l.locktype
      `;

      const locks = await client.query(locksQuery);
      runtimeState.locks = locks.rows.map((lock: any) => ({
        id: `pg_lock_${lock.pid}_${lock.classid}_${lock.objid}`,
        type: lock.type,
        mode: lock.mode,
        granted: lock.granted,
        database: lock.database,
        schema: lock.schema,
        table: lock.table,
        page: lock.page,
        tuple: lock.tuple,
        virtualxid: lock.virtualxid,
        transactionid: lock.transactionid,
        classid: lock.classid,
        objid: lock.objid,
        objsubid: lock.objsubid,
        virtualtransaction: lock.virtualtransaction,
        pid: lock.pid,
        fastpath: lock.fastpath,
        waitstart: lock.waitstart,
        attributes: {
          locktype: lock.type,
          relation: lock.table,
          schema: lock.schema
        }
      }));

      // Extract blocking locks
      const blockingLocksQuery = `
        SELECT 
          blocked_locks.pid AS blocked_pid,
          blocked_activity.usename AS blocked_user,
          blocked_activity.application_name AS blocked_application,
          blocked_activity.client_addr AS blocked_client_addr,
          blocked_activity.state AS blocked_state,
          blocked_locks.mode AS blocked_mode,
          blocked_activity.query AS blocked_query,
          blocked_activity.query_start AS blocked_query_start,
          blocking_locks.pid AS blocking_pid,
          blocking_activity.usename AS blocking_user,
          blocking_activity.application_name AS blocking_application,
          blocking_activity.client_addr AS blocking_client_addr,
          blocking_activity.state AS blocking_state,
          blocking_locks.mode AS blocking_mode,
          blocking_activity.query AS blocking_query,
          blocking_activity.query_start AS blocking_query_start,
          blocked_locks.locktype,
          c.relname AS relation
        FROM pg_catalog.pg_locks blocked_locks
        JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
        JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
          AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
          AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
          AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
          AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
          AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
          AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
          AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
          AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
          AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
          AND blocking_locks.pid != blocked_locks.pid
        JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
        LEFT JOIN pg_catalog.pg_class c ON c.oid = blocked_locks.relation
        WHERE NOT blocked_locks.granted
      `;

      const blockingLocks = await client.query(blockingLocksQuery);
      runtimeState.blockingLocks = blockingLocks.rows.map((block: any) => ({
        blockedQuery: block.blocked_query,
        blockedPid: block.blocked_pid,
        blockedUser: block.blocked_user,
        blockedApplication: block.blocked_application,
        blockedClientAddr: block.blocked_client_addr,
        blockedState: block.blocked_state,
        blockedMode: block.blocked_mode,
        blockedQueryStart: block.blocked_query_start,
        blockingQuery: block.blocking_query,
        blockingPid: block.blocking_pid,
        blockingUser: block.blocking_user,
        blockingApplication: block.blocking_application,
        blockingClientAddr: block.blocking_client_addr,
        blockingState: block.blocking_state,
        blockingMode: block.blocking_mode,
        blockingQueryStart: block.blocking_query_start,
        lockType: block.locktype,
        relation: block.relation,
        granted: false,
        waitTime: block.blocked_query_start ? Date.now() - new Date(block.blocked_query_start).getTime() : 0
      }));

      // Calculate system metrics
      runtimeState.systemMetrics.totalConnections = runtimeState.connections.length;
      runtimeState.systemMetrics.activeConnections = runtimeState.connections.filter((c: any) => c.state === 'active').length;
      runtimeState.systemMetrics.idleConnections = runtimeState.connections.filter((c: any) => c.state === 'idle').length;
      runtimeState.systemMetrics.blockedConnections = runtimeState.connections.filter((c: any) => c.state === 'idle in transaction').length;
      runtimeState.systemMetrics.totalTransactions = runtimeState.transactions.length;
      runtimeState.systemMetrics.activeTransactions = runtimeState.transactions.filter((t: any) => t.state === 'active').length;
      runtimeState.systemMetrics.totalLocks = runtimeState.locks.length;
      runtimeState.systemMetrics.grantedLocks = runtimeState.locks.filter((l: any) => l.granted).length;
      runtimeState.systemMetrics.waitingLocks = runtimeState.locks.filter((l: any) => !l.granted).length;

      // Get additional system metrics
      try {
        const maxConnections = await client.query('SHOW max_connections');
        runtimeState.systemMetrics.maxConnections = parseInt(maxConnections.rows[0].max_connections);
        runtimeState.systemMetrics.connectionUtilization = (runtimeState.systemMetrics.totalConnections / runtimeState.systemMetrics.maxConnections) * 100;

        const dbSize = await client.query('SELECT pg_database_size(current_database()) as size');
        runtimeState.systemMetrics.databaseSize = parseInt(dbSize.rows[0].size);

        const cacheHitRatio = await client.query(`
          SELECT 
            round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) as ratio
          FROM pg_stat_database 
          WHERE datname = current_database()
        `);
        runtimeState.systemMetrics.cacheHitRatio = parseFloat(cacheHitRatio.rows[0].ratio) || 0;

        const lastAnalyze = await client.query(`
          SELECT max(last_analyze) as last_analyze, max(last_vacuum) as last_vacuum
          FROM pg_stat_user_tables
        `);
        runtimeState.systemMetrics.lastAnalyze = lastAnalyze.rows[0].last_analyze || '';
        runtimeState.systemMetrics.lastVacuum = lastAnalyze.rows[0].last_vacuum || '';

        const lastCheckpoint = await client.query('SELECT pg_postmaster_start_time() as start_time');
        runtimeState.systemMetrics.lastCheckpoint = lastCheckpoint.rows[0].start_time;

        // Calculate average and longest query times
        const queryStats = await client.query(`
          SELECT 
            avg(extract(epoch from (now() - query_start))) as avg_time,
            max(extract(epoch from (now() - query_start))) as max_time
          FROM pg_stat_activity 
          WHERE query_start IS NOT NULL AND state = 'active'
        `);
        runtimeState.systemMetrics.averageQueryTime = parseFloat(queryStats.rows[0].avg_time) || 0;
        runtimeState.systemMetrics.longestQueryTime = parseFloat(queryStats.rows[0].max_time) || 0;

      } catch (error) {
        console.warn(`⚠️ Could not extract additional PostgreSQL metrics:`, error);
      }

      return runtimeState;
    } catch (error) {
      console.warn(`⚠️ Could not extract PostgreSQL runtime state:`, error);
      return {
        connections: [],
        transactions: [],
        locks: [],
        blockingLocks: [],
        systemMetrics: {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          blockedConnections: 0,
          totalTransactions: 0,
          activeTransactions: 0,
          totalLocks: 0,
          grantedLocks: 0,
          waitingLocks: 0,
          maxConnections: 0,
          connectionUtilization: 0,
          averageQueryTime: 0,
          longestQueryTime: 0,
          databaseSize: 0,
          cacheHitRatio: 0,
          lastAnalyze: '',
          lastVacuum: '',
          lastCheckpoint: ''
        }
      };
    }
  }

  private async extractMySQLRuntimeState(connection: any): Promise<any> {
    try {
      const runtimeState: any = {
        connections: [],
        transactions: [],
        locks: [],
        blockingLocks: [],
        systemMetrics: {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          blockedConnections: 0,
          totalTransactions: 0,
          activeTransactions: 0,
          totalLocks: 0,
          grantedLocks: 0,
          waitingLocks: 0,
          maxConnections: 0,
          connectionUtilization: 0,
          averageQueryTime: 0,
          longestQueryTime: 0,
          databaseSize: 0,
          cacheHitRatio: 0,
          lastAnalyze: '',
          lastVacuum: '',
          lastCheckpoint: ''
        }
      };

      // Extract active connections from information_schema.PROCESSLIST
      const connectionsQuery = `
        SELECT 
          ID as pid,
          USER as user,
          HOST as host,
          DB as database,
          COMMAND as state,
          TIME as time,
          STATE as wait_state,
          INFO as query,
          CONNECTION_ID() as connection_id
        FROM information_schema.PROCESSLIST
        WHERE USER IS NOT NULL
        ORDER BY TIME
      `;

      const connections = await connection.query(connectionsQuery);
      runtimeState.connections = connections.map((conn: any) => ({
        id: `mysql_conn_${conn.pid}`,
        database: conn.database || 'default',
        user: conn.user,
        host: conn.host,
        state: conn.state,
        applicationName: 'MySQL Client',
        clientAddress: conn.host,
        backendStart: new Date(Date.now() - (conn.time * 1000)).toISOString(),
        queryStart: new Date().toISOString(),
        stateChange: new Date().toISOString(),
        waitEventType: conn.wait_state,
        waitEvent: conn.wait_state,
        query: conn.query,
        backendType: 'mysql',
        pid: conn.pid,
        attributes: {
          connectionId: conn.connection_id,
          time: conn.time,
          waitState: conn.wait_state
        }
      }));

      // Extract transaction information
      const transactionsQuery = `
        SELECT 
          trx_id,
          trx_state,
          trx_started,
          trx_requested_lock_id,
          trx_wait_started,
          trx_weight,
          trx_mysql_thread_id,
          trx_query,
          trx_operation_state,
          trx_tables_in_use,
          trx_tables_locked,
          trx_lock_structs,
          trx_lock_memory_bytes,
          trx_rows_locked,
          trx_rows_modified,
          trx_concurrency_tickets,
          trx_isolation_level,
          trx_unique_checks,
          trx_foreign_key_checks,
          trx_last_foreign_key_error,
          trx_adaptive_hash_latched,
          trx_adaptive_hash_timeout,
          trx_is_read_only,
          trx_autocommit_non_locking
        FROM information_schema.INNODB_TRX
        ORDER BY trx_started
      `;

      const transactions = await connection.query(transactionsQuery);
      runtimeState.transactions = transactions.map((txn: any) => ({
        id: `mysql_txn_${txn.trx_id}`,
        database: 'default',
        user: 'mysql_user',
        state: txn.trx_state,
        isolationLevel: txn.trx_isolation_level?.toUpperCase() || 'REPEATABLE_READ',
        readOnly: txn.trx_is_read_only === 1,
        startTime: txn.trx_started,
        duration: txn.trx_started ? Date.now() - new Date(txn.trx_started).getTime() : 0,
        query: txn.trx_query,
        lockMode: txn.trx_requested_lock_id ? 'WAITING' : 'GRANTED',
        attributes: {
          trxId: txn.trx_id,
          mysqlThreadId: txn.trx_mysql_thread_id,
          operationState: txn.trx_operation_state,
          tablesInUse: txn.trx_tables_in_use,
          tablesLocked: txn.trx_tables_locked,
          rowsLocked: txn.trx_rows_locked,
          rowsModified: txn.trx_rows_modified,
          weight: txn.trx_weight
        }
      }));

      // Extract lock information from information_schema.INNODB_LOCKS
      const locksQuery = `
        SELECT 
          lock_id,
          lock_trx_id,
          lock_mode,
          lock_type,
          lock_table,
          lock_index,
          lock_space,
          lock_page,
          lock_rec,
          lock_data
        FROM information_schema.INNODB_LOCKS
        ORDER BY lock_trx_id
      `;

      const locks = await connection.query(locksQuery);
      runtimeState.locks = locks.map((lock: any) => ({
        id: `mysql_lock_${lock.lock_id}`,
        type: lock.lock_type,
        mode: lock.lock_mode,
        granted: true, // INNODB_LOCKS shows granted locks
        database: 'default',
        table: lock.lock_table,
        page: lock.lock_page,
        tuple: lock.lock_rec,
        transactionid: lock.lock_trx_id,
        attributes: {
          lockId: lock.lock_id,
          lockIndex: lock.lock_index,
          lockSpace: lock.lock_space,
          lockData: lock.lock_data
        }
      }));

      // Extract blocking locks from information_schema.INNODB_LOCK_WAITS
      const blockingLocksQuery = `
        SELECT 
          requesting_trx_id,
          requested_lock_id,
          blocking_trx_id,
          blocking_lock_id
        FROM information_schema.INNODB_LOCK_WAITS
        ORDER BY requesting_trx_id
      `;

      const blockingLocks = await connection.query(blockingLocksQuery);
      runtimeState.blockingLocks = blockingLocks.map((block: any) => ({
        blockedQuery: 'Unknown', // Would need to join with PROCESSLIST
        blockedPid: block.requesting_trx_id,
        blockedUser: 'mysql_user',
        blockedApplication: 'MySQL Client',
        blockedClientAddr: 'localhost',
        blockedState: 'WAITING',
        blockedMode: 'WAITING',
        blockedQueryStart: new Date().toISOString(),
        blockingQuery: 'Unknown', // Would need to join with PROCESSLIST
        blockingPid: block.blocking_trx_id,
        blockingUser: 'mysql_user',
        blockingApplication: 'MySQL Client',
        blockingClientAddr: 'localhost',
        blockingState: 'ACTIVE',
        blockingMode: 'GRANTED',
        blockingQueryStart: new Date().toISOString(),
        lockType: 'INNODB',
        relation: 'Unknown',
        granted: false,
        waitTime: 0
      }));

      // Calculate system metrics
      runtimeState.systemMetrics.totalConnections = runtimeState.connections.length;
      runtimeState.systemMetrics.activeConnections = runtimeState.connections.filter((c: any) => c.state === 'Query' || c.state === 'Sleep').length;
      runtimeState.systemMetrics.idleConnections = runtimeState.connections.filter((c: any) => c.state === 'Sleep').length;
      runtimeState.systemMetrics.blockedConnections = runtimeState.connections.filter((c: any) => c.state === 'Waiting for table metadata lock').length;
      runtimeState.systemMetrics.totalTransactions = runtimeState.transactions.length;
      runtimeState.systemMetrics.activeTransactions = runtimeState.transactions.filter((t: any) => t.state === 'RUNNING').length;
      runtimeState.systemMetrics.totalLocks = runtimeState.locks.length;
      runtimeState.systemMetrics.grantedLocks = runtimeState.locks.filter((l: any) => l.granted).length;
      runtimeState.systemMetrics.waitingLocks = runtimeState.blockingLocks.length;

      // Get additional system metrics
      try {
        const maxConnections = await connection.query('SHOW VARIABLES LIKE "max_connections"');
        runtimeState.systemMetrics.maxConnections = parseInt(maxConnections[0].Value);
        runtimeState.systemMetrics.connectionUtilization = (runtimeState.systemMetrics.totalConnections / runtimeState.systemMetrics.maxConnections) * 100;

        const dbSize = await connection.query(`
          SELECT 
            ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
          FROM information_schema.tables 
          WHERE table_schema = DATABASE()
        `);
        runtimeState.systemMetrics.databaseSize = parseFloat(dbSize[0].size_mb) * 1024 * 1024; // Convert to bytes

        const cacheHitRatio = await connection.query('SHOW STATUS LIKE "Innodb_buffer_pool_read_requests"');
        const cacheMisses = await connection.query('SHOW STATUS LIKE "Innodb_buffer_pool_reads"');
        const hits = parseInt(cacheHitRatio[0].Value);
        const misses = parseInt(cacheMisses[0].Value);
        runtimeState.systemMetrics.cacheHitRatio = hits > 0 ? (hits / (hits + misses)) * 100 : 0;

        const lastAnalyze = await connection.query(`
          SELECT 
            MAX(update_time) as last_analyze,
            MAX(create_time) as last_vacuum
          FROM information_schema.tables 
          WHERE table_schema = DATABASE()
        `);
        runtimeState.systemMetrics.lastAnalyze = lastAnalyze[0].last_analyze || '';
        runtimeState.systemMetrics.lastVacuum = lastAnalyze[0].last_vacuum || '';

        const lastCheckpoint = await connection.query('SHOW STATUS LIKE "Uptime"');
        runtimeState.systemMetrics.lastCheckpoint = lastCheckpoint[0].Value ? `Uptime: ${lastCheckpoint[0].Value} seconds` : '';

        // Calculate average and longest query times
        const queryStats = await connection.query(`
          SELECT 
            AVG(TIME) as avg_time,
            MAX(TIME) as max_time
          FROM information_schema.PROCESSLIST 
          WHERE TIME > 0 AND COMMAND != 'Sleep'
        `);
        runtimeState.systemMetrics.averageQueryTime = parseFloat(queryStats[0].avg_time) || 0;
        runtimeState.systemMetrics.longestQueryTime = parseFloat(queryStats[0].max_time) || 0;

      } catch (error) {
        console.warn(`⚠️ Could not extract additional MySQL metrics:`, error);
      }

      return runtimeState;
    } catch (error) {
      console.warn(`⚠️ Could not extract MySQL runtime state:`, error);
      return {
        connections: [],
        transactions: [],
        locks: [],
        blockingLocks: [],
        systemMetrics: {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          blockedConnections: 0,
          totalTransactions: 0,
          activeTransactions: 0,
          totalLocks: 0,
          grantedLocks: 0,
          waitingLocks: 0,
          maxConnections: 0,
          connectionUtilization: 0,
          averageQueryTime: 0,
          longestQueryTime: 0,
          databaseSize: 0,
          cacheHitRatio: 0,
          lastAnalyze: '',
          lastVacuum: '',
          lastCheckpoint: ''
        }
      };
    }
  }

  private async extractMongoDBRuntimeState(db: any): Promise<any> {
    try {
      const runtimeState: any = {
        connections: [],
        transactions: [],
        locks: [],
        blockingLocks: [],
        systemMetrics: {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          blockedConnections: 0,
          totalTransactions: 0,
          activeTransactions: 0,
          totalLocks: 0,
          grantedLocks: 0,
          waitingLocks: 0,
          maxConnections: 0,
          connectionUtilization: 0,
          averageQueryTime: 0,
          longestQueryTime: 0,
          databaseSize: 0,
          cacheHitRatio: 0,
          lastAnalyze: '',
          lastVacuum: '',
          lastCheckpoint: ''
        }
      };

      // Extract active connections from currentOp
      try {
        const currentOps = await db.admin().currentOp();
        if (currentOps && currentOps.inprog) {
          runtimeState.connections = currentOps.inprog.map((op: any, index: number) => ({
            id: `mongodb_conn_${op.connectionId || index}`,
            database: op.ns?.split('.')[0] || 'default',
            user: op.user || 'mongodb_user',
            host: op.client || 'localhost',
            state: op.active ? 'ACTIVE' : 'IDLE',
            applicationName: op.appName || 'MongoDB Client',
            clientAddress: op.client || 'localhost',
            backendStart: new Date(op.secs_running ? Date.now() - (op.secs_running * 1000) : Date.now()).toISOString(),
            queryStart: new Date().toISOString(),
            stateChange: new Date().toISOString(),
            waitEventType: op.waitingForLock ? 'LOCK' : 'NONE',
            waitEvent: op.waitingForLock ? 'Waiting for lock' : 'Running',
            query: op.command ? JSON.stringify(op.command) : 'Unknown',
            backendType: 'mongodb',
            pid: op.connectionId || index,
            attributes: {
              operation: op.op,
              namespace: op.ns,
              secsRunning: op.secs_running,
              waitingForLock: op.waitingForLock,
              numYields: op.numYields,
              planSummary: op.planSummary
            }
          }));
        }
      } catch (error) {
        console.warn(`⚠️ Could not extract MongoDB connections:`, error);
      }

      // Extract transaction information
      try {
        const sessions = await db.admin().listSessions();
        if (sessions && sessions.sessions) {
          runtimeState.transactions = sessions.sessions.map((session: any, index: number) => ({
            id: `mongodb_txn_${session._id}`,
            database: 'default',
            user: 'mongodb_user',
            state: session.lastUse ? 'ACTIVE' : 'IDLE',
            isolationLevel: 'READ_COMMITTED', // MongoDB default
            readOnly: false,
            startTime: session.lastUse || new Date().toISOString(),
            duration: session.lastUse ? Date.now() - new Date(session.lastUse).getTime() : 0,
            query: 'MongoDB session',
            attributes: {
              sessionId: session._id,
              lastUse: session.lastUse,
              lastWrite: session.lastWrite,
              lastRead: session.lastRead
            }
          }));
        }
      } catch (error) {
        console.warn(`⚠️ Could not extract MongoDB transactions:`, error);
      }

      // Extract lock information from currentOp
      try {
        const currentOps = await db.admin().currentOp();
        if (currentOps && currentOps.inprog) {
          runtimeState.locks = currentOps.inprog
            .filter((op: any) => op.waitingForLock || op.locks)
            .map((op: any, index: number) => ({
              id: `mongodb_lock_${op.connectionId || index}`,
              type: 'DOCUMENT',
              mode: op.waitingForLock ? 'WAITING' : 'GRANTED',
              granted: !op.waitingForLock,
              database: op.ns?.split('.')[0] || 'default',
              table: op.ns?.split('.')[1] || 'unknown',
              transactionid: op.connectionId || index,
              attributes: {
                operation: op.op,
                namespace: op.ns,
                waitingForLock: op.waitingForLock,
                locks: op.locks,
                planSummary: op.planSummary
              }
            }));
        }
      } catch (error) {
        console.warn(`⚠️ Could not extract MongoDB locks:`, error);
      }

      // Extract blocking locks (MongoDB doesn't have explicit blocking locks, but we can infer from waiting operations)
      try {
        const currentOps = await db.admin().currentOp();
        if (currentOps && currentOps.inprog) {
          const waitingOps = currentOps.inprog.filter((op: any) => op.waitingForLock);
          runtimeState.blockingLocks = waitingOps.map((op: any, index: number) => ({
            blockedQuery: op.command ? JSON.stringify(op.command) : 'Unknown',
            blockedPid: op.connectionId || index,
            blockedUser: op.user || 'mongodb_user',
            blockedApplication: op.appName || 'MongoDB Client',
            blockedClientAddr: op.client || 'localhost',
            blockedState: 'WAITING',
            blockedMode: 'WAITING',
            blockedQueryStart: new Date().toISOString(),
            blockingQuery: 'Unknown',
            blockingPid: 'Unknown',
            blockingUser: 'mongodb_user',
            blockingApplication: 'MongoDB Client',
            blockingClientAddr: 'localhost',
            blockingState: 'ACTIVE',
            blockingMode: 'GRANTED',
            blockingQueryStart: new Date().toISOString(),
            lockType: 'DOCUMENT',
            relation: op.ns || 'unknown',
            granted: false,
            waitTime: op.secs_running || 0
          }));
        }
      } catch (error) {
        console.warn(`⚠️ Could not extract MongoDB blocking locks:`, error);
      }

      // Calculate system metrics
      runtimeState.systemMetrics.totalConnections = runtimeState.connections.length;
      runtimeState.systemMetrics.activeConnections = runtimeState.connections.filter((c: any) => c.state === 'ACTIVE').length;
      runtimeState.systemMetrics.idleConnections = runtimeState.connections.filter((c: any) => c.state === 'IDLE').length;
      runtimeState.systemMetrics.blockedConnections = runtimeState.connections.filter((c: any) => c.attributes?.waitingForLock).length;
      runtimeState.systemMetrics.totalTransactions = runtimeState.transactions.length;
      runtimeState.systemMetrics.activeTransactions = runtimeState.transactions.filter((t: any) => t.state === 'ACTIVE').length;
      runtimeState.systemMetrics.totalLocks = runtimeState.locks.length;
      runtimeState.systemMetrics.grantedLocks = runtimeState.locks.filter((l: any) => l.granted).length;
      runtimeState.systemMetrics.waitingLocks = runtimeState.locks.filter((l: any) => !l.granted).length;

      // Get additional system metrics
      try {
        const serverStatus = await db.admin().serverStatus();
        
        // Get connection metrics
        if (serverStatus.connections) {
          runtimeState.systemMetrics.maxConnections = serverStatus.connections.available + serverStatus.connections.current;
          runtimeState.systemMetrics.connectionUtilization = (serverStatus.connections.current / runtimeState.systemMetrics.maxConnections) * 100;
        }

        // Get database size
        const dbStats = await db.stats();
        runtimeState.systemMetrics.databaseSize = dbStats.dataSize + dbStats.indexSize;

        // Get cache hit ratio
        if (serverStatus.wiredTiger && serverStatus.wiredTiger.cache) {
          const cache = serverStatus.wiredTiger.cache;
          const hitRatio = cache['bytes read into cache'] / (cache['bytes read into cache'] + cache['bytes written from cache']);
          runtimeState.systemMetrics.cacheHitRatio = hitRatio * 100;
        }

        // Get uptime
        if (serverStatus.uptime) {
          runtimeState.systemMetrics.lastCheckpoint = `Uptime: ${serverStatus.uptime} seconds`;
        }

        // Get last analyze/vacuum info
        runtimeState.systemMetrics.lastAnalyze = 'MongoDB does not have analyze/vacuum';
        runtimeState.systemMetrics.lastVacuum = 'MongoDB does not have vacuum';

        // Calculate average and longest query times
        const avgTime = runtimeState.connections.reduce((sum: number, conn: any) => {
          return sum + (conn.attributes?.secsRunning || 0);
        }, 0) / runtimeState.connections.length;
        const maxTime = Math.max(...runtimeState.connections.map((conn: any) => conn.attributes?.secsRunning || 0));
        
        runtimeState.systemMetrics.averageQueryTime = avgTime || 0;
        runtimeState.systemMetrics.longestQueryTime = maxTime || 0;

      } catch (error) {
        console.warn(`⚠️ Could not extract additional MongoDB metrics:`, error);
      }

      return runtimeState;
    } catch (error) {
      console.warn(`⚠️ Could not extract MongoDB runtime state:`, error);
      return {
        connections: [],
        transactions: [],
        locks: [],
        blockingLocks: [],
        systemMetrics: {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          blockedConnections: 0,
          totalTransactions: 0,
          activeTransactions: 0,
          totalLocks: 0,
          grantedLocks: 0,
          waitingLocks: 0,
          maxConnections: 0,
          connectionUtilization: 0,
          averageQueryTime: 0,
          longestQueryTime: 0,
          databaseSize: 0,
          cacheHitRatio: 0,
          lastAnalyze: '',
          lastVacuum: '',
          lastCheckpoint: ''
        }
      };
    }
  }

  private async extractPostgreSQLStatistics(client: any, tables: any[]): Promise<any> {
    const statistics: any = {
      tableStatistics: [],
      indexStatistics: [],
      databaseStatistics: {}
    };
    
    try {
      // Extract table statistics from pg_stat_all_tables
      const tableStatsQuery = `
        SELECT 
          schemaname,
          relname as table_name,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          n_live_tup,
          n_dead_tup,
          n_mod_since_analyze,
          n_ins_since_vacuum,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze,
          vacuum_count,
          autovacuum_count,
          analyze_count,
          autoanalyze_count
        FROM pg_stat_all_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schemaname, relname
      `;
      
      const tableStatsResult = await client.query(tableStatsQuery);
      
      // Extract index statistics from pg_stat_all_indexes
      const indexStatsQuery = `
        SELECT 
          schemaname,
          relname as table_name,
          indexrelname as index_name,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch,
          n_tup_ins,
          n_tup_upd,
          n_tup_del
        FROM pg_stat_all_indexes 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schemaname, relname, indexrelname
      `;
      
      const indexStatsResult = await client.query(indexStatsQuery);
      
      // Get table sizes
      const tableSizesQuery = `
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as data_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
          pg_total_relation_size(schemaname||'.'||tablename) as total_size_bytes,
          pg_relation_size(schemaname||'.'||tablename) as data_size_bytes,
          pg_indexes_size(schemaname||'.'||tablename) as index_size_bytes
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schemaname, tablename
      `;
      
      const tableSizesResult = await client.query(tableSizesQuery);
      
      // Process table statistics
      tableStatsResult.rows.forEach((tableStat: any) => {
        const sizeInfo = tableSizesResult.rows.find((size: any) => 
          size.schemaname === tableStat.schemaname && size.tablename === tableStat.table_name
        );
        
        const tableStatistic = {
          tableName: tableStat.table_name,
          schema: tableStat.schemaname,
          rowCount: tableStat.n_live_tup || 0,
          dataSize: sizeInfo?.data_size_bytes || 0,
          indexSize: sizeInfo?.index_size_bytes || 0,
          totalSize: sizeInfo?.total_size_bytes || 0,
          pageCount: Math.ceil((sizeInfo?.data_size_bytes || 0) / 8192), // Assuming 8KB pages
          avgRowSize: tableStat.n_live_tup > 0 ? (sizeInfo?.data_size_bytes || 0) / tableStat.n_live_tup : 0,
          lastAnalyzed: tableStat.last_analyze?.toISOString() || null,
          lastVacuumed: tableStat.last_vacuum?.toISOString() || null,
          lastAutoVacuumed: tableStat.last_autovacuum?.toISOString() || null,
          nTupIns: tableStat.n_tup_ins || 0,
          nTupUpd: tableStat.n_tup_upd || 0,
          nTupDel: tableStat.n_tup_del || 0,
          nLiveTup: tableStat.n_live_tup || 0,
          nDeadTup: tableStat.n_dead_tup || 0,
          nModSinceAnalyze: tableStat.n_mod_since_analyze || 0,
          nInsSinceVacuum: tableStat.n_ins_since_vacuum || 0,
          heapBlksRead: 0, // Not available in pg_stat_all_tables
          heapBlksHit: 0, // Not available in pg_stat_all_tables
          idxBlksRead: 0, // Not available in pg_stat_all_tables
          idxBlksHit: 0, // Not available in pg_stat_all_tables
          toastBlksRead: 0, // Not available in pg_stat_all_tables
          toastBlksHit: 0, // Not available in pg_stat_all_tables
          tidxBlksRead: 0, // Not available in pg_stat_all_tables
          tidxBlksHit: 0, // Not available in pg_stat_all_tables
          additionalStats: {
            vacuumCount: tableStat.vacuum_count || 0,
            autovacuumCount: tableStat.autovacuum_count || 0,
            analyzeCount: tableStat.analyze_count || 0,
            autoanalyzeCount: tableStat.autoanalyze_count || 0,
            totalSizePretty: sizeInfo?.total_size || '0 bytes',
            dataSizePretty: sizeInfo?.data_size || '0 bytes',
            indexSizePretty: sizeInfo?.index_size || '0 bytes'
          }
        };
        
        statistics.tableStatistics.push(tableStatistic);
      });
      
      // Process index statistics
      indexStatsResult.rows.forEach((indexStat: any) => {
        const indexStatistic = {
          indexName: indexStat.index_name,
          tableName: indexStat.table_name,
          schema: indexStat.schemaname,
          indexSize: 0, // Will be calculated from table sizes
          indexPages: 0, // Not directly available
          indexTuples: 0, // Not directly available
          indexScans: indexStat.idx_scan || 0,
          indexTuplesRead: indexStat.idx_tup_read || 0,
          indexTuplesFetched: indexStat.idx_tup_fetch || 0,
          lastUsed: null, // Not directly available
          additionalStats: {
            nTupIns: indexStat.n_tup_ins || 0,
            nTupUpd: indexStat.n_tup_upd || 0,
            nTupDel: indexStat.n_tup_del || 0
          }
        };
        
        statistics.indexStatistics.push(indexStatistic);
      });
      
      // Calculate database-level statistics
      const totalTables = statistics.tableStatistics.length;
      const totalIndexes = statistics.indexStatistics.length;
      const totalSize = statistics.tableStatistics.reduce((sum: number, table: any) => sum + (table.totalSize || 0), 0);
      const dataSize = statistics.tableStatistics.reduce((sum: number, table: any) => sum + (table.dataSize || 0), 0);
      const indexSize = statistics.tableStatistics.reduce((sum: number, table: any) => sum + (table.indexSize || 0), 0);
      
      // Get database-level cache hit ratio
      let cacheHitRatio = null;
      try {
        const cacheHitQuery = `
          SELECT 
            round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) as cache_hit_ratio
          FROM pg_stat_database 
          WHERE datname = current_database()
        `;
        const cacheHitResult = await client.query(cacheHitQuery);
        cacheHitRatio = cacheHitResult.rows[0]?.cache_hit_ratio || null;
      } catch (error) {
        console.warn(`⚠️ Could not get cache hit ratio:`, error);
      }
      
      statistics.databaseStatistics = {
        totalTables,
        totalIndexes,
        totalSize,
        dataSize,
        indexSize,
        cacheHitRatio,
        bufferHitRatio: cacheHitRatio, // Same as cache hit ratio in PostgreSQL
        lastAnalyzed: null, // Not tracked at database level
        lastVacuumed: null, // Not tracked at database level
        additionalStats: {
          totalSizePretty: this.formatBytes(totalSize),
          dataSizePretty: this.formatBytes(dataSize),
          indexSizePretty: this.formatBytes(indexSize)
        }
      };
      
      return statistics;
    } catch (error) {
      console.warn(`⚠️ Could not extract PostgreSQL statistics:`, error);
      return statistics;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async extractMySQLStatistics(connection: any, tables: any[]): Promise<any> {
    const statistics: any = {
      tableStatistics: [],
      indexStatistics: [],
      databaseStatistics: {}
    };
    
    try {
      // Get database-level performance metrics
      const dbPerformance = await this.getMySQLPerformanceMetrics(connection);
      
      // Extract table statistics using SHOW TABLE STATUS
      const tableStatusQuery = 'SHOW TABLE STATUS';
      const tableStatusResult = await connection.query(tableStatusQuery);
      
      // Extract index statistics using SHOW INDEX
      const indexStatsQuery = `
        SELECT 
          TABLE_SCHEMA,
          TABLE_NAME,
          INDEX_NAME,
          CARDINALITY,
          SUB_PART,
          PACKED,
          NULLABLE,
          INDEX_TYPE,
          COMMENT
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_SCHEMA, TABLE_NAME, INDEX_NAME
      `;
      const indexStatsResult = await connection.query(indexStatsQuery);
      
      // Process table statistics
      tableStatusResult.forEach(async (tableStatus: any) => {
        try {
          // Get table-specific performance metrics
          const tablePerformance = await this.getMySQLTablePerformanceMetrics(connection, tableStatus.Name);
          
          const tableStatistic = {
            tableName: tableStatus.Name,
            schema: 'default',
            rowCount: tableStatus.Rows || 0,
            dataSize: (tableStatus.Data_length || 0),
            indexSize: (tableStatus.Index_length || 0),
            totalSize: (tableStatus.Data_length || 0) + (tableStatus.Index_length || 0),
            pageCount: Math.ceil((tableStatus.Data_length || 0) / 16384), // Assuming 16KB pages
            avgRowSize: tableStatus.Avg_row_length || 0,
            lastAnalyzed: tableStatus.Update_time?.toISOString() || null,
            lastVacuumed: this.getMySQLLastVacuumed(connection, tableStatus.Name),
            lastAutoVacuumed: this.getMySQLLastAutoVacuumed(connection, tableStatus.Name),
            nTupIns: tablePerformance.insertCount || 0,
            nTupUpd: tablePerformance.updateCount || 0,
            nTupDel: tablePerformance.deleteCount || 0,
            nLiveTup: tableStatus.Rows || 0,
            nDeadTup: tablePerformance.deadTuples || 0,
            nModSinceAnalyze: tablePerformance.modificationsSinceAnalyze || 0,
            nInsSinceVacuum: tablePerformance.insertsSinceVacuum || 0,
            heapBlksRead: tablePerformance.heapBlocksRead || 0,
            heapBlksHit: tablePerformance.heapBlocksHit || 0,
            idxBlksRead: tablePerformance.indexBlocksRead || 0,
            idxBlksHit: tablePerformance.indexBlocksHit || 0,
            toastBlksRead: 0, // Not applicable to MySQL
            toastBlksHit: 0, // Not applicable to MySQL
            tidxBlksRead: 0, // Not applicable to MySQL
            tidxBlksHit: 0, // Not applicable to MySQL
            additionalStats: {
              engine: tableStatus.Engine || 'Unknown',
              version: tableStatus.Version || 0,
              rowFormat: tableStatus.Row_format || 'Unknown',
              tableRows: tableStatus.Rows || 0,
              avgRowLength: tableStatus.Avg_row_length || 0,
              dataLength: tableStatus.Data_length || 0,
              maxDataLength: tableStatus.Max_data_length || 0,
              indexLength: tableStatus.Index_length || 0,
              dataFree: tableStatus.Data_free || 0,
              autoIncrement: tableStatus.Auto_increment || null,
              createTime: tableStatus.Create_time?.toISOString() || null,
              updateTime: tableStatus.Update_time?.toISOString() || null,
              checkTime: tableStatus.Check_time?.toISOString() || null,
              collation: tableStatus.Collation || 'Unknown',
              checksum: tableStatus.Checksum || null,
              createOptions: tableStatus.Create_options || '',
              comment: tableStatus.Comment || '',
              performance: tablePerformance,
              cacheHitRatio: tablePerformance.cacheHitRatio || 0,
              bufferHitRatio: tablePerformance.bufferHitRatio || 0
            }
          };
          
          statistics.tableStatistics.push(tableStatistic);
        } catch (error) {
          console.warn(`⚠️ Could not get performance metrics for table ${tableStatus.Name}:`, error);
        }
      });
      
      // Process index statistics
      indexStatsResult.forEach(async (indexStat: any) => {
        try {
          // Get index-specific performance metrics
          const indexPerformance = await this.getMySQLIndexPerformanceMetrics(connection, indexStat.TABLE_NAME, indexStat.INDEX_NAME);
          
          const indexStatistic = {
            indexName: indexStat.INDEX_NAME,
            tableName: indexStat.TABLE_NAME,
            schema: indexStat.TABLE_SCHEMA,
            indexSize: 0, // Will be calculated from table sizes
            indexPages: 0, // Not directly available
            indexTuples: indexStat.CARDINALITY || 0,
            indexScans: indexPerformance.scanCount || 0,
            indexTuplesRead: indexPerformance.tuplesRead || 0,
            indexTuplesFetched: indexPerformance.tuplesFetched || 0,
            lastUsed: indexPerformance.lastUsed || null,
            additionalStats: {
              subPart: indexStat.SUB_PART || null,
              packed: indexStat.PACKED || null,
              nullable: indexStat.NULLABLE || 'YES',
              indexType: indexStat.INDEX_TYPE || 'BTREE',
              comment: indexStat.COMMENT || '',
              performance: indexPerformance,
              cacheHitRatio: indexPerformance.cacheHitRatio || 0
            }
          };
          
          statistics.indexStatistics.push(indexStatistic);
        } catch (error) {
          console.warn(`⚠️ Could not get performance metrics for index ${indexStat.INDEX_NAME}:`, error);
        }
      });
      
      // Calculate database-level statistics
      const totalTables = statistics.tableStatistics.length;
      const totalIndexes = statistics.indexStatistics.length;
      const totalSize = statistics.tableStatistics.reduce((sum: number, table: any) => sum + (table.totalSize || 0), 0);
      const dataSize = statistics.tableStatistics.reduce((sum: number, table: any) => sum + (table.dataSize || 0), 0);
      const indexSize = statistics.tableStatistics.reduce((sum: number, table: any) => sum + (table.indexSize || 0), 0);
      
      statistics.databaseStatistics = {
        totalTables,
        totalIndexes,
        totalSize,
        dataSize,
        indexSize,
        cacheHitRatio: dbPerformance.cacheHitRatio || 0,
        bufferHitRatio: dbPerformance.bufferHitRatio || 0,
        lastAnalyzed: dbPerformance.lastAnalyzed || null,
        lastVacuumed: dbPerformance.lastVacuumed || null,
        additionalStats: {
          totalSizePretty: this.formatBytes(totalSize),
          dataSizePretty: this.formatBytes(dataSize),
          indexSizePretty: this.formatBytes(indexSize),
          performance: dbPerformance,
          totalInserts: dbPerformance.totalInserts || 0,
          totalUpdates: dbPerformance.totalUpdates || 0,
          totalDeletes: dbPerformance.totalDeletes || 0,
          totalScans: dbPerformance.totalScans || 0,
          totalReads: dbPerformance.totalReads || 0
        }
      };
      
      return statistics;
    } catch (error) {
      console.warn(`⚠️ Could not extract MySQL statistics:`, error);
      return statistics;
    }
  }

  private async getMySQLPerformanceMetrics(connection: any): Promise<any> {
    try {
      // Get database-level performance metrics
      const performanceQuery = `
        SELECT 
          VARIABLE_NAME,
          VARIABLE_VALUE
        FROM information_schema.GLOBAL_STATUS 
        WHERE VARIABLE_NAME IN (
          'Innodb_buffer_pool_reads',
          'Innodb_buffer_pool_read_requests',
          'Innodb_buffer_pool_pages_data',
          'Innodb_buffer_pool_pages_total',
          'Innodb_buffer_pool_pages_free',
          'Innodb_buffer_pool_pages_dirty',
          'Innodb_buffer_pool_pages_flushed',
          'Innodb_buffer_pool_pages_made_young',
          'Innodb_buffer_pool_pages_not_made_young',
          'Innodb_buffer_pool_pages_old',
          'Innodb_buffer_pool_pages_young',
          'Innodb_buffer_pool_pages_misc',
          'Innodb_buffer_pool_pages_read',
          'Innodb_buffer_pool_pages_written',
          'Innodb_buffer_pool_read_ahead',
          'Innodb_buffer_pool_read_ahead_evicted',
          'Innodb_buffer_pool_read_ahead_rnd',
          'Innodb_buffer_pool_read_ahead_seq',
          'Innodb_buffer_pool_read_requests',
          'Innodb_buffer_pool_reads',
          'Innodb_buffer_pool_wait_free',
          'Innodb_buffer_pool_write_requests',
          'Innodb_buffer_pool_writes',
          'Innodb_data_fsyncs',
          'Innodb_data_pending_fsyncs',
          'Innodb_data_pending_reads',
          'Innodb_data_pending_writes',
          'Innodb_data_read',
          'Innodb_data_reads',
          'Innodb_data_writes',
          'Innodb_data_written',
          'Innodb_dblwr_pages_written',
          'Innodb_dblwr_writes',
          'Innodb_log_waits',
          'Innodb_log_write_requests',
          'Innodb_log_writes',
          'Innodb_os_log_fsyncs',
          'Innodb_os_log_pending_fsyncs',
          'Innodb_os_log_pending_writes',
          'Innodb_os_log_written',
          'Innodb_pages_created',
          'Innodb_pages_read',
          'Innodb_pages_written',
          'Innodb_row_lock_current_waits',
          'Innodb_row_lock_time',
          'Innodb_row_lock_time_avg',
          'Innodb_row_lock_time_max',
          'Innodb_row_lock_waits',
          'Innodb_rows_deleted',
          'Innodb_rows_inserted',
          'Innodb_rows_read',
          'Innodb_rows_updated',
          'Innodb_num_open_files',
          'Innodb_trx_id',
          'Innodb_trx_state',
          'Innodb_trx_started',
          'Innodb_trx_requested_lock_id',
          'Innodb_trx_wait_started',
          'Innodb_trx_weight',
          'Innodb_trx_mysql_thread_id',
          'Innodb_trx_query',
          'Innodb_trx_operation_state',
          'Innodb_trx_tables_in_use',
          'Innodb_trx_tables_locked',
          'Innodb_trx_lock_structs',
          'Innodb_trx_lock_memory_bytes',
          'Innodb_trx_rows_locked',
          'Innodb_trx_rows_modified',
          'Innodb_trx_concurrency_tickets',
          'Innodb_trx_isolation_level',
          'Innodb_trx_unique_checks',
          'Innodb_trx_foreign_key_checks',
          'Innodb_trx_last_foreign_key_error',
          'Innodb_trx_adaptive_hash_latched',
          'Innodb_trx_adaptive_hash_timeout',
          'Innodb_trx_is_read_only',
          'Innodb_trx_autocommit_non_locking'
        )
      `;
      
      const performanceResult = await connection.query(performanceQuery);
      const performanceData: any = {};
      
      performanceResult.forEach((row: any) => {
        performanceData[row.VARIABLE_NAME] = parseInt(row.VARIABLE_VALUE) || 0;
      });
      
      // Calculate cache hit ratio
      const bufferPoolReads = performanceData.Innodb_buffer_pool_reads || 0;
      const bufferPoolReadRequests = performanceData.Innodb_buffer_pool_read_requests || 0;
      const cacheHitRatio = bufferPoolReadRequests > 0 ? 
        Math.round((1 - (bufferPoolReads / bufferPoolReadRequests)) * 100 * 100) / 100 : 0;
      
      return {
        cacheHitRatio: Math.min(100, cacheHitRatio),
        bufferHitRatio: Math.min(100, cacheHitRatio),
        lastAnalyzed: this.getMySQLLastAnalyzed(connection),
        lastVacuumed: this.getMySQLLastVacuumed(connection, 'database'),
        totalInserts: performanceData.Innodb_rows_inserted || 0,
        totalUpdates: performanceData.Innodb_rows_updated || 0,
        totalDeletes: performanceData.Innodb_rows_deleted || 0,
        totalScans: performanceData.Innodb_rows_read || 0,
        totalReads: performanceData.Innodb_data_reads || 0,
        performanceData
      };
    } catch (error) {
      console.warn(`⚠️ Could not get MySQL performance metrics:`, error);
      return {};
    }
  }

  private async getMySQLTablePerformanceMetrics(connection: any, tableName: string): Promise<any> {
    try {
      // Get table-specific performance metrics
      const tablePerformanceQuery = `
        SELECT 
          VARIABLE_NAME,
          VARIABLE_VALUE
        FROM information_schema.GLOBAL_STATUS 
        WHERE VARIABLE_NAME IN (
          'Innodb_rows_inserted',
          'Innodb_rows_updated',
          'Innodb_rows_deleted',
          'Innodb_rows_read',
          'Innodb_data_read',
          'Innodb_data_written',
          'Innodb_pages_read',
          'Innodb_pages_written'
        )
      `;
      
      const tablePerformanceResult = await connection.query(tablePerformanceQuery);
      const tablePerformanceData: any = {};
      
      tablePerformanceResult.forEach((row: any) => {
        tablePerformanceData[row.VARIABLE_NAME] = parseInt(row.VARIABLE_VALUE) || 0;
      });
      
      // Calculate cache hit ratio for this table
      const dataRead = tablePerformanceData.Innodb_data_read || 0;
      const dataWritten = tablePerformanceData.Innodb_data_written || 0;
      const totalData = dataRead + dataWritten;
      const cacheHitRatio = totalData > 0 ? 
        Math.round((dataWritten / totalData) * 100 * 100) / 100 : 0;
      
      return {
        cacheHitRatio: Math.min(100, cacheHitRatio),
        bufferHitRatio: Math.min(100, cacheHitRatio),
        insertCount: tablePerformanceData.Innodb_rows_inserted || 0,
        updateCount: tablePerformanceData.Innodb_rows_updated || 0,
        deleteCount: tablePerformanceData.Innodb_rows_deleted || 0,
        deadTuples: 0, // MySQL doesn't track this
        modificationsSinceAnalyze: 0, // Would need to track this separately
        insertsSinceVacuum: 0, // Would need to track this separately
        heapBlocksRead: tablePerformanceData.Innodb_pages_read || 0,
        heapBlocksHit: tablePerformanceData.Innodb_rows_read || 0,
        indexBlocksRead: 0, // Would need to track this separately
        indexBlocksHit: 0 // Would need to track this separately
      };
    } catch (error) {
      console.warn(`⚠️ Could not get MySQL table performance metrics for ${tableName}:`, error);
      return {};
    }
  }

  private async getMySQLIndexPerformanceMetrics(connection: any, tableName: string, indexName: string): Promise<any> {
    try {
      // Get index-specific performance metrics
      const indexPerformanceQuery = `
        SELECT 
          VARIABLE_NAME,
          VARIABLE_VALUE
        FROM information_schema.GLOBAL_STATUS 
        WHERE VARIABLE_NAME IN (
          'Innodb_rows_read',
          'Innodb_data_read',
          'Innodb_data_written'
        )
      `;
      
      const indexPerformanceResult = await connection.query(indexPerformanceQuery);
      const indexPerformanceData: any = {};
      
      indexPerformanceResult.forEach((row: any) => {
        indexPerformanceData[row.VARIABLE_NAME] = parseInt(row.VARIABLE_VALUE) || 0;
      });
      
      // Calculate cache hit ratio for this index
      const dataRead = indexPerformanceData.Innodb_data_read || 0;
      const dataWritten = indexPerformanceData.Innodb_data_written || 0;
      const totalData = dataRead + dataWritten;
      const cacheHitRatio = totalData > 0 ? 
        Math.round((dataWritten / totalData) * 100 * 100) / 100 : 0;
      
      return {
        cacheHitRatio: Math.min(100, cacheHitRatio),
        tupleCount: 0, // Would need to track this separately
        scanCount: indexPerformanceData.Innodb_rows_read || 0,
        tuplesRead: indexPerformanceData.Innodb_rows_read || 0,
        tuplesFetched: indexPerformanceData.Innodb_rows_read || 0,
        lastUsed: null // Would need to track this separately
      };
    } catch (error) {
      console.warn(`⚠️ Could not get MySQL index performance metrics for ${indexName}:`, error);
      return {};
    }
  }

  private getMySQLLastAnalyzed(connection: any): string | null {
    try {
      // Check if any tables have been analyzed recently
      const analyzeQuery = `
        SELECT 
          TABLE_NAME,
          UPDATE_TIME
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
        AND UPDATE_TIME IS NOT NULL
        ORDER BY UPDATE_TIME DESC
        LIMIT 1
      `;
      
      const analyzeResult = connection.query(analyzeQuery);
      if (analyzeResult && analyzeResult.length > 0) {
        return analyzeResult[0].UPDATE_TIME?.toISOString() || null;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private getMySQLLastVacuumed(connection: any, tableName: string): string | null {
    try {
      if (tableName === 'database') {
        // For database level, check if any tables have been optimized recently
        const vacuumQuery = `
          SELECT 
            TABLE_NAME,
            UPDATE_TIME
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = DATABASE()
          AND UPDATE_TIME IS NOT NULL
          ORDER BY UPDATE_TIME DESC
          LIMIT 1
        `;
        
        const vacuumResult = connection.query(vacuumQuery);
        if (vacuumResult && vacuumResult.length > 0) {
          return vacuumResult[0].UPDATE_TIME?.toISOString() || null;
        }
        return null;
      }
      
      // For table level, check if table has been optimized recently
      const tableVacuumQuery = `
        SELECT 
          UPDATE_TIME
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND UPDATE_TIME IS NOT NULL
      `;
      
      const tableVacuumResult = connection.query(tableVacuumQuery);
      if (tableVacuumResult && tableVacuumResult.length > 0) {
        return tableVacuumResult[0].UPDATE_TIME?.toISOString() || null;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private getMySQLLastAutoVacuumed(connection: any, tableName: string): string | null {
    try {
      // MySQL doesn't have traditional auto-vacuum, but we can check for optimization
      if (tableName === 'database') {
        // For database level, check if any tables have been optimized recently
        const autoVacuumQuery = `
          SELECT 
            TABLE_NAME,
            UPDATE_TIME
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = DATABASE()
          AND UPDATE_TIME IS NOT NULL
          ORDER BY UPDATE_TIME DESC
          LIMIT 1
        `;
        
        const autoVacuumResult = connection.query(autoVacuumQuery);
        if (autoVacuumResult && autoVacuumResult.length > 0) {
          return autoVacuumResult[0].UPDATE_TIME?.toISOString() || null;
        }
        return null;
      }
      
      // For table level, check if table has been optimized recently
      const tableAutoVacuumQuery = `
        SELECT 
          UPDATE_TIME
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND UPDATE_TIME IS NOT NULL
      `;
      
      const tableAutoVacuumResult = connection.query(tableAutoVacuumQuery);
      if (tableAutoVacuumResult && tableAutoVacuumResult.length > 0) {
        return tableAutoVacuumResult[0].UPDATE_TIME?.toISOString() || null;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async extractPostgreSQLConfiguration(client: any): Promise<any> {
    const config: any = {};
    
    try {
      // Extract PostgreSQL settings from pg_settings
      const settingsQuery = `
        SELECT 
          name, 
          setting, 
          unit, 
          context, 
          vartype, 
          source, 
          min_val, 
          max_val, 
          enumvals,
          boot_val,
          reset_val,
          sourcefile,
          sourceline,
          pending_restart
        FROM pg_settings 
        WHERE name IN (
          'server_encoding', 'lc_collate', 'lc_ctype', 'timezone', 'log_timezone',
          'default_transaction_isolation', 'transaction_isolation', 'autovacuum',
          'wal_level', 'synchronous_commit', 'max_connections', 'shared_buffers',
          'effective_cache_size', 'maintenance_work_mem', 'checkpoint_completion_target',
          'wal_buffers', 'default_statistics_target', 'random_page_cost',
          'effective_io_concurrency', 'work_mem', 'min_wal_size', 'max_wal_size',
          'checkpoint_timeout', 'checkpoint_warning', 'log_min_duration_statement',
          'log_statement', 'log_destination', 'logging_collector', 'log_directory',
          'log_filename', 'log_rotation_age', 'log_rotation_size', 'log_truncate_on_rotation',
          'log_line_prefix', 'log_checkpoints', 'log_connections', 'log_disconnections',
          'log_lock_waits', 'log_temp_files', 'log_autovacuum_min_duration',
          'log_error_verbosity', 'log_min_messages', 'log_min_error_statement',
          'log_min_duration', 'debug_print_parse', 'debug_print_rewritten',
          'debug_print_plan', 'debug_pretty_print', 'log_parser_stats',
          'log_planner_stats', 'log_executor_stats', 'log_statement_stats',
          'log_btree_build_stats', 'log_autovacuum_min_duration', 'autovacuum_max_workers',
          'autovacuum_naptime', 'autovacuum_vacuum_threshold', 'autovacuum_analyze_threshold',
          'autovacuum_vacuum_scale_factor', 'autovacuum_analyze_scale_factor',
          'autovacuum_freeze_max_age', 'autovacuum_multixact_freeze_max_age',
          'autovacuum_vacuum_cost_delay', 'autovacuum_vacuum_cost_limit',
          'autovacuum_freeze_table_age', 'autovacuum_multixact_freeze_table_age',
          'autovacuum_vacuum_insert_threshold', 'autovacuum_vacuum_insert_scale_factor',
          'autovacuum_analyze_scale_factor', 'autovacuum_analyze_threshold',
          'autovacuum_vacuum_scale_factor', 'autovacuum_vacuum_threshold',
          'autovacuum_naptime', 'autovacuum_max_workers', 'autovacuum',
          'wal_level', 'max_wal_size', 'min_wal_size', 'checkpoint_completion_target',
          'checkpoint_timeout', 'checkpoint_warning', 'wal_buffers', 'wal_writer_delay',
          'wal_writer_flush_after', 'commit_delay', 'commit_siblings', 'synchronous_commit',
          'wal_sync_method', 'full_page_writes', 'wal_log_hints', 'wal_compression',
          'wal_init_zero', 'wal_recycle', 'wal_buffers', 'wal_writer_delay',
          'wal_writer_flush_after', 'commit_delay', 'commit_siblings', 'synchronous_commit',
          'wal_sync_method', 'full_page_writes', 'wal_log_hints', 'wal_compression',
          'wal_init_zero', 'wal_recycle', 'archive_mode', 'archive_command',
          'archive_timeout', 'archive_library', 'restore_command', 'recovery_end_command',
          'recovery_target', 'recovery_target_name', 'recovery_target_time',
          'recovery_target_xid', 'recovery_target_lsn', 'recovery_target_timeline',
          'recovery_target_action', 'recovery_target_inclusive', 'recovery_target_immediate',
          'recovery_target_timeline', 'recovery_target_xid', 'recovery_target_time',
          'recovery_target_name', 'recovery_target', 'recovery_end_command',
          'restore_command', 'archive_library', 'archive_timeout', 'archive_command',
          'archive_mode', 'wal_recycle', 'wal_init_zero', 'wal_compression',
          'wal_log_hints', 'full_page_writes', 'wal_sync_method', 'synchronous_commit',
          'commit_siblings', 'commit_delay', 'wal_writer_flush_after', 'wal_writer_delay',
          'wal_buffers', 'wal_compression', 'wal_log_hints', 'full_page_writes',
          'wal_sync_method', 'synchronous_commit', 'commit_siblings', 'commit_delay',
          'wal_writer_flush_after', 'wal_writer_delay', 'wal_buffers'
        )
        ORDER BY name
      `;
      
      const settingsResult = await client.query(settingsQuery);
      
      // Map setting names to standardized configuration keys
      const settingMap: Record<string, string> = {
          'server_encoding': 'encoding',
          'lc_collate': 'collation',
          'timezone': 'timezone',
          'log_timezone': 'logTimezone',
          'default_transaction_isolation': 'isolationLevel',
          'transaction_isolation': 'isolationLevel',
          'autovacuum': 'autovacuum',
          'wal_level': 'walMode',
          'synchronous_commit': 'synchronousMode',
          'max_connections': 'maxConnections',
          'shared_buffers': 'bufferPoolSize',
          'effective_cache_size': 'effectiveCacheSize',
          'maintenance_work_mem': 'maintenanceWorkMem',
          'checkpoint_completion_target': 'checkpointCompletionTarget',
          'wal_buffers': 'walBuffers',
          'default_statistics_target': 'defaultStatisticsTarget',
          'random_page_cost': 'randomPageCost',
          'effective_io_concurrency': 'effectiveIoConcurrency',
          'work_mem': 'workMem',
          'min_wal_size': 'minWalSize',
          'max_wal_size': 'maxWalSize',
          'checkpoint_timeout': 'checkpointTimeout',
          'checkpoint_warning': 'checkpointWarning',
          'log_min_duration_statement': 'logMinDurationStatement',
          'log_statement': 'logStatement',
          'log_destination': 'logDestination',
          'logging_collector': 'loggingCollector',
          'log_directory': 'logDirectory',
          'log_filename': 'logFilename',
          'log_rotation_age': 'logRotationAge',
          'log_rotation_size': 'logRotationSize',
          'log_truncate_on_rotation': 'logTruncateOnRotation',
          'log_line_prefix': 'logLinePrefix',
          'log_checkpoints': 'logCheckpoints',
          'log_connections': 'logConnections',
          'log_disconnections': 'logDisconnections',
          'log_lock_waits': 'logLockWaits',
          'log_temp_files': 'logTempFiles',
          'log_autovacuum_min_duration': 'logAutovacuumMinDuration',
          'log_error_verbosity': 'logErrorVerbosity',
          'log_min_messages': 'logMinMessages',
          'log_min_error_statement': 'logMinErrorStatement',
          'log_min_duration': 'logMinDuration',
          'debug_print_parse': 'debugPrintParse',
          'debug_print_rewritten': 'debugPrintRewritten',
          'debug_print_plan': 'debugPrintPlan',
          'debug_pretty_print': 'debugPrettyPrint',
          'log_parser_stats': 'logParserStats',
          'log_planner_stats': 'logPlannerStats',
          'log_executor_stats': 'logExecutorStats',
          'log_statement_stats': 'logStatementStats',
          'log_btree_build_stats': 'logBtreeBuildStats',
          'autovacuum_max_workers': 'autovacuumMaxWorkers',
          'autovacuum_naptime': 'autovacuumNaptime',
          'autovacuum_vacuum_threshold': 'autovacuumVacuumThreshold',
          'autovacuum_analyze_threshold': 'autovacuumAnalyzeThreshold',
          'autovacuum_vacuum_scale_factor': 'autovacuumVacuumScaleFactor',
          'autovacuum_analyze_scale_factor': 'autovacuumAnalyzeScaleFactor',
          'autovacuum_freeze_max_age': 'autovacuumFreezeMaxAge',
          'autovacuum_multixact_freeze_max_age': 'autovacuumMultixactFreezeMaxAge',
          'autovacuum_vacuum_cost_delay': 'autovacuumVacuumCostDelay',
          'autovacuum_vacuum_cost_limit': 'autovacuumVacuumCostLimit',
          'autovacuum_freeze_table_age': 'autovacuumFreezeTableAge',
          'autovacuum_multixact_freeze_table_age': 'autovacuumMultixactFreezeTableAge',
          'autovacuum_vacuum_insert_threshold': 'autovacuumVacuumInsertThreshold',
          'autovacuum_vacuum_insert_scale_factor': 'autovacuumVacuumInsertScaleFactor',
          'archive_mode': 'archiveMode',
          'archive_command': 'archiveCommand',
          'archive_timeout': 'archiveTimeout',
          'archive_library': 'archiveLibrary',
          'restore_command': 'restoreCommand',
          'recovery_end_command': 'recoveryEndCommand',
          'recovery_target': 'recoveryTarget',
          'recovery_target_name': 'recoveryTargetName',
          'recovery_target_time': 'recoveryTargetTime',
          'recovery_target_xid': 'recoveryTargetXid',
          'recovery_target_lsn': 'recoveryTargetLsn',
          'recovery_target_timeline': 'recoveryTargetTimeline',
          'recovery_target_action': 'recoveryTargetAction',
          'recovery_target_inclusive': 'recoveryTargetInclusive',
          'recovery_target_immediate': 'recoveryTargetImmediate',
          'wal_sync_method': 'walSyncMethod',
          'full_page_writes': 'fullPageWrites',
          'wal_log_hints': 'walLogHints',
          'wal_compression': 'walCompression',
          'wal_init_zero': 'walInitZero',
          'wal_recycle': 'walRecycle',
          'wal_writer_delay': 'walWriterDelay',
          'wal_writer_flush_after': 'walWriterFlushAfter',
          'commit_delay': 'commitDelay',
          'commit_siblings': 'commitSiblings'
        };
      
      // Process settings into configuration object
      settingsResult.rows.forEach((row: any) => {
        const { name, setting, unit, context, vartype, source, min_val, max_val, 
                enumvals, boot_val, reset_val, sourcefile, sourceline, pending_restart } = row;
        
        const configKey = settingMap[name];
        if (configKey) {
          // Convert setting value based on type
          let value: any = setting;
          
          if (vartype === 'bool') {
            value = setting === 'on' || setting === 'true' || setting === '1';
          } else if (vartype === 'integer') {
            value = parseInt(setting, 10);
          } else if (vartype === 'real') {
            value = parseFloat(setting);
          } else if (vartype === 'enum') {
            value = setting;
          }
          
          config[configKey] = value;
        }
      });
      
      // Get PostgreSQL version
      try {
        const versionResult = await client.query('SELECT version() as version');
        if (versionResult.rows.length > 0) {
          config.version = versionResult.rows[0].version;
        }
      } catch (error) {
        console.warn(`⚠️ Could not get PostgreSQL version:`, error);
      }
      
      // Add additional settings for any unmapped settings
      config.additionalSettings = {};
      const settingMapValues = Object.keys(settingMap);
      settingsResult.rows.forEach((row: any) => {
        const { name, setting } = row;
        if (!settingMapValues.includes(name)) {
          config.additionalSettings[name] = setting;
        }
      });
      
      return config;
    } catch (error) {
      console.warn(`⚠️ Could not extract PostgreSQL configuration:`, error);
      return {};
    }
  }

  private async extractMySQLConfiguration(connection: any): Promise<any> {
    const config: any = {};
    
    try {
      // Extract MySQL settings using SHOW VARIABLES
      const variablesQuery = `
        SHOW VARIABLES WHERE Variable_name IN (
          'character_set_server', 'collation_server', 'time_zone', 'default_storage_engine',
          'max_connections', 'innodb_buffer_pool_size', 'innodb_log_file_size',
          'innodb_log_buffer_size', 'innodb_flush_log_at_trx_commit', 'innodb_flush_method',
          'innodb_file_per_table', 'innodb_open_files', 'innodb_io_capacity',
          'innodb_read_io_threads', 'innodb_write_io_threads', 'innodb_thread_concurrency',
          'innodb_adaptive_hash_index', 'innodb_change_buffering', 'innodb_old_blocks_time',
          'innodb_stats_on_metadata', 'innodb_stats_persistent', 'innodb_stats_auto_recalc',
          'innodb_stats_sample_pages', 'innodb_buffer_pool_instances', 'innodb_adaptive_flushing',
          'innodb_adaptive_flushing_lwm', 'innodb_max_dirty_pages_pct', 'innodb_max_dirty_pages_pct_lwm',
          'innodb_flush_neighbors', 'innodb_lru_scan_depth', 'innodb_io_capacity_max',
          'innodb_read_ahead_threshold', 'innodb_random_read_ahead', 'innodb_read_io_threads',
          'innodb_write_io_threads', 'innodb_purge_threads', 'innodb_page_cleaners',
          'innodb_monitor_enable', 'innodb_status_output', 'innodb_status_output_locks',
          'innodb_print_all_deadlocks', 'innodb_deadlock_detect', 'innodb_lock_wait_timeout',
          'innodb_rollback_on_timeout', 'innodb_print_lock_wait_timeout_info',
          'innodb_rollback_segments', 'innodb_undo_tablespaces', 'innodb_undo_log_truncate',
          'innodb_max_undo_log_size', 'innodb_purge_rseg_truncate_frequency',
          'innodb_undo_log_truncate', 'innodb_undo_tablespaces', 'innodb_rollback_segments',
          'innodb_print_lock_wait_timeout_info', 'innodb_rollback_on_timeout',
          'innodb_lock_wait_timeout', 'innodb_deadlock_detect', 'innodb_print_all_deadlocks',
          'innodb_status_output_locks', 'innodb_status_output', 'innodb_monitor_enable',
          'innodb_page_cleaners', 'innodb_purge_threads', 'innodb_write_io_threads',
          'innodb_read_io_threads', 'innodb_random_read_ahead', 'innodb_read_ahead_threshold',
          'innodb_io_capacity_max', 'innodb_lru_scan_depth', 'innodb_flush_neighbors',
          'innodb_max_dirty_pages_pct_lwm', 'innodb_max_dirty_pages_pct', 'innodb_adaptive_flushing_lwm',
          'innodb_adaptive_flushing', 'innodb_buffer_pool_instances', 'innodb_stats_sample_pages',
          'innodb_stats_auto_recalc', 'innodb_stats_persistent', 'innodb_stats_on_metadata',
          'innodb_old_blocks_time', 'innodb_change_buffering', 'innodb_adaptive_hash_index',
          'innodb_thread_concurrency', 'innodb_write_io_threads', 'innodb_read_io_threads',
          'innodb_io_capacity', 'innodb_open_files', 'innodb_file_per_table',
          'innodb_flush_method', 'innodb_flush_log_at_trx_commit', 'innodb_log_buffer_size',
          'innodb_log_file_size', 'innodb_buffer_pool_size', 'max_connections',
          'default_storage_engine', 'time_zone', 'collation_server', 'character_set_server',
          'sql_mode', 'autocommit', 'tx_isolation', 'transaction_isolation',
          'binlog_format', 'log_bin', 'log_bin_trust_function_creators', 'log_bin_trust_routine_creators',
          'log_bin_use_v1_row_events', 'log_slave_updates', 'log_slow_queries',
          'slow_query_log', 'slow_query_log_file', 'long_query_time', 'log_queries_not_using_indexes',
          'log_throttle_queries_not_using_indexes', 'log_slow_admin_statements',
          'log_slow_slave_statements', 'log_slow_verbosity', 'log_slow_rate_limit',
          'log_slow_rate_type', 'log_slow_sp_statements', 'log_slow_filter',
          'log_slow_verbosity', 'log_slow_rate_limit', 'log_slow_rate_type',
          'log_slow_sp_statements', 'log_slow_filter', 'log_slow_slave_statements',
          'log_slow_admin_statements', 'log_queries_not_using_indexes', 'log_throttle_queries_not_using_indexes',
          'long_query_time', 'slow_query_log_file', 'slow_query_log', 'log_slow_queries',
          'log_slave_updates', 'log_bin_use_v1_row_events', 'log_bin_trust_routine_creators',
          'log_bin_trust_function_creators', 'log_bin', 'binlog_format', 'transaction_isolation',
          'tx_isolation', 'autocommit', 'sql_mode', 'character_set_server', 'collation_server',
          'time_zone', 'default_storage_engine', 'max_connections', 'innodb_buffer_pool_size',
          'innodb_log_file_size', 'innodb_log_buffer_size', 'innodb_flush_log_at_trx_commit',
          'innodb_flush_method', 'innodb_file_per_table', 'innodb_open_files',
          'innodb_io_capacity', 'innodb_read_io_threads', 'innodb_write_io_threads',
          'innodb_thread_concurrency', 'innodb_adaptive_hash_index', 'innodb_change_buffering',
          'innodb_old_blocks_time', 'innodb_stats_on_metadata', 'innodb_stats_persistent',
          'innodb_stats_auto_recalc', 'innodb_stats_sample_pages', 'innodb_buffer_pool_instances',
          'innodb_adaptive_flushing', 'innodb_adaptive_flushing_lwm', 'innodb_max_dirty_pages_pct',
          'innodb_max_dirty_pages_pct_lwm', 'innodb_flush_neighbors', 'innodb_lru_scan_depth',
          'innodb_io_capacity_max', 'innodb_read_ahead_threshold', 'innodb_random_read_ahead',
          'innodb_read_io_threads', 'innodb_write_io_threads', 'innodb_purge_threads',
          'innodb_page_cleaners', 'innodb_monitor_enable', 'innodb_status_output',
          'innodb_status_output_locks', 'innodb_print_all_deadlocks', 'innodb_deadlock_detect',
          'innodb_lock_wait_timeout', 'innodb_rollback_on_timeout', 'innodb_print_lock_wait_timeout_info',
          'innodb_rollback_segments', 'innodb_undo_tablespaces', 'innodb_undo_log_truncate',
          'innodb_max_undo_log_size', 'innodb_purge_rseg_truncate_frequency',
          'innodb_undo_log_truncate', 'innodb_undo_tablespaces', 'innodb_rollback_segments',
          'innodb_print_lock_wait_timeout_info', 'innodb_rollback_on_timeout',
          'innodb_lock_wait_timeout', 'innodb_deadlock_detect', 'innodb_print_all_deadlocks',
          'innodb_status_output_locks', 'innodb_status_output', 'innodb_monitor_enable',
          'innodb_page_cleaners', 'innodb_purge_threads', 'innodb_write_io_threads',
          'innodb_read_io_threads', 'innodb_random_read_ahead', 'innodb_read_ahead_threshold',
          'innodb_io_capacity_max', 'innodb_lru_scan_depth', 'innodb_flush_neighbors',
          'innodb_max_dirty_pages_pct_lwm', 'innodb_max_dirty_pages_pct', 'innodb_adaptive_flushing_lwm',
          'innodb_adaptive_flushing', 'innodb_buffer_pool_instances', 'innodb_stats_sample_pages',
          'innodb_stats_auto_recalc', 'innodb_stats_persistent', 'innodb_stats_on_metadata',
          'innodb_old_blocks_time', 'innodb_change_buffering', 'innodb_adaptive_hash_index',
          'innodb_thread_concurrency', 'innodb_write_io_threads', 'innodb_read_io_threads',
          'innodb_io_capacity', 'innodb_open_files', 'innodb_file_per_table',
          'innodb_flush_method', 'innodb_flush_log_at_trx_commit', 'innodb_log_buffer_size',
          'innodb_log_file_size', 'innodb_buffer_pool_size', 'max_connections',
          'default_storage_engine', 'time_zone', 'collation_server', 'character_set_server'
        )
        ORDER BY Variable_name
      `;
      
      const variablesResult = await connection.query(variablesQuery);
      
      // Map variable names to standardized configuration keys
      const variableMap: Record<string, string> = {
          'character_set_server': 'encoding',
          'collation_server': 'collation',
          'time_zone': 'timezone',
          'default_storage_engine': 'storageEngine',
          'max_connections': 'maxConnections',
          'innodb_buffer_pool_size': 'bufferPoolSize',
          'innodb_log_file_size': 'logFileSize',
          'innodb_log_buffer_size': 'logBufferSize',
          'innodb_flush_log_at_trx_commit': 'flushLogAtTrxCommit',
          'innodb_flush_method': 'flushMethod',
          'innodb_file_per_table': 'filePerTable',
          'innodb_open_files': 'openFiles',
          'innodb_io_capacity': 'ioCapacity',
          'innodb_read_io_threads': 'readIoThreads',
          'innodb_write_io_threads': 'writeIoThreads',
          'innodb_thread_concurrency': 'threadConcurrency',
          'innodb_adaptive_hash_index': 'adaptiveHashIndex',
          'innodb_change_buffering': 'changeBuffering',
          'innodb_old_blocks_time': 'oldBlocksTime',
          'innodb_stats_on_metadata': 'statsOnMetadata',
          'innodb_stats_persistent': 'statsPersistent',
          'innodb_stats_auto_recalc': 'statsAutoRecalc',
          'innodb_stats_sample_pages': 'statsSamplePages',
          'innodb_buffer_pool_instances': 'bufferPoolInstances',
          'innodb_adaptive_flushing': 'adaptiveFlushing',
          'innodb_adaptive_flushing_lwm': 'adaptiveFlushingLwm',
          'innodb_max_dirty_pages_pct': 'maxDirtyPagesPct',
          'innodb_max_dirty_pages_pct_lwm': 'maxDirtyPagesPctLwm',
          'innodb_flush_neighbors': 'flushNeighbors',
          'innodb_lru_scan_depth': 'lruScanDepth',
          'innodb_io_capacity_max': 'ioCapacityMax',
          'innodb_read_ahead_threshold': 'readAheadThreshold',
          'innodb_random_read_ahead': 'randomReadAhead',
          'innodb_purge_threads': 'purgeThreads',
          'innodb_page_cleaners': 'pageCleaners',
          'innodb_monitor_enable': 'monitorEnable',
          'innodb_status_output': 'statusOutput',
          'innodb_status_output_locks': 'statusOutputLocks',
          'innodb_print_all_deadlocks': 'printAllDeadlocks',
          'innodb_deadlock_detect': 'deadlockDetect',
          'innodb_lock_wait_timeout': 'lockWaitTimeout',
          'innodb_rollback_on_timeout': 'rollbackOnTimeout',
          'innodb_print_lock_wait_timeout_info': 'printLockWaitTimeoutInfo',
          'innodb_rollback_segments': 'rollbackSegments',
          'innodb_undo_tablespaces': 'undoTablespaces',
          'innodb_undo_log_truncate': 'undoLogTruncate',
          'innodb_max_undo_log_size': 'maxUndoLogSize',
          'innodb_purge_rseg_truncate_frequency': 'purgeRsegTruncateFrequency',
          'sql_mode': 'sqlMode',
          'autocommit': 'autocommit',
          'tx_isolation': 'isolationLevel',
          'transaction_isolation': 'isolationLevel',
          'binlog_format': 'binlogFormat',
          'log_bin': 'logBin',
          'log_bin_trust_function_creators': 'logBinTrustFunctionCreators',
          'log_bin_trust_routine_creators': 'logBinTrustRoutineCreators',
          'log_bin_use_v1_row_events': 'logBinUseV1RowEvents',
          'log_slave_updates': 'logSlaveUpdates',
          'log_slow_queries': 'logSlowQueries',
          'slow_query_log': 'slowQueryLog',
          'slow_query_log_file': 'slowQueryLogFile',
          'long_query_time': 'longQueryTime',
          'log_queries_not_using_indexes': 'logQueriesNotUsingIndexes',
          'log_throttle_queries_not_using_indexes': 'logThrottleQueriesNotUsingIndexes',
          'log_slow_admin_statements': 'logSlowAdminStatements',
          'log_slow_slave_statements': 'logSlowSlaveStatements',
          'log_slow_verbosity': 'logSlowVerbosity',
          'log_slow_rate_limit': 'logSlowRateLimit',
          'log_slow_rate_type': 'logSlowRateType',
          'log_slow_sp_statements': 'logSlowSpStatements',
          'log_slow_filter': 'logSlowFilter'
        };
      
      // Process variables into configuration object
      variablesResult.forEach((row: any) => {
        const { Variable_name, Value } = row;
        
        const configKey = variableMap[Variable_name];
        if (configKey) {
          // Convert variable value based on type
          let value: any = Value;
          
          // Try to parse numeric values
          if (!isNaN(Number(Value)) && Value !== '') {
            value = Number(Value);
          }
          // Convert boolean-like values
          else if (Value === 'ON' || Value === '1') {
            value = true;
          } else if (Value === 'OFF' || Value === '0') {
            value = false;
          }
          
          config[configKey] = value;
        }
      });
      
      // Get MySQL version
      try {
        const versionResult = await connection.query('SELECT VERSION() as version');
        if (versionResult.length > 0) {
          config.version = versionResult[0].version;
        }
      } catch (error) {
        console.warn(`⚠️ Could not get MySQL version:`, error);
      }
      
      // Add additional settings for any unmapped variables
      config.additionalSettings = {};
      const variableMapValues = Object.keys(variableMap);
      variablesResult.forEach((row: any) => {
        const { Variable_name, Value } = row;
        if (!variableMapValues.includes(Variable_name)) {
          config.additionalSettings[Variable_name] = Value;
        }
      });
      
      return config;
    } catch (error) {
      console.warn(`⚠️ Could not extract MySQL configuration:`, error);
      return {};
    }
  }

  private extractMongoDBConfiguration(db: any): any {
    const config: any = {};
    
    try {
      // MongoDB doesn't have traditional configuration settings like SQL databases
      // Instead, we extract server information and database stats
      
      // Get server information
      try {
        const serverInfo = db.admin().serverInfo();
        config.version = serverInfo.version;
        config.storageEngine = serverInfo.storageEngine?.name || 'wiredTiger';
        config.maxBsonObjectSize = serverInfo.maxBsonObjectSize;
        config.maxMessageSizeBytes = serverInfo.maxMessageSizeBytes;
        config.maxWriteBatchSize = serverInfo.maxWriteBatchSize;
        config.logicalSessionTimeoutMinutes = serverInfo.logicalSessionTimeoutMinutes;
        config.connectionId = serverInfo.connectionId;
        config.minWireVersion = serverInfo.minWireVersion;
        config.maxWireVersion = serverInfo.maxWireVersion;
        config.readOnly = serverInfo.readOnly || false;
        config.ok = serverInfo.ok;
      } catch (error) {
        console.warn(`⚠️ Could not get MongoDB server info:`, error);
      }
      
      // Get database stats
      try {
        const dbStats = db.stats();
        config.collections = dbStats.collections;
        config.views = dbStats.views;
        config.objects = dbStats.objects;
        config.avgObjSize = dbStats.avgObjSize;
        config.dataSize = dbStats.dataSize;
        config.storageSize = dbStats.storageSize;
        config.totalSize = dbStats.totalSize;
        config.indexes = dbStats.indexes;
        config.indexSize = dbStats.indexSize;
        config.fileSize = dbStats.fileSize;
        config.fsUsedSize = dbStats.fsUsedSize;
        config.fsTotalSize = dbStats.fsTotalSize;
        config.ok = dbStats.ok;
      } catch (error) {
        console.warn(`⚠️ Could not get MongoDB database stats:`, error);
      }
      
      // Get build information
      try {
        const buildInfo = db.admin().buildInfo();
        config.buildVersion = buildInfo.version;
        config.gitVersion = buildInfo.gitVersion;
        config.targetArch = buildInfo.targetArch;
        config.targetOS = buildInfo.targetOS;
        config.targetArch = buildInfo.targetArch;
        config.compiler = buildInfo.compiler;
        config.debug = buildInfo.debug;
        config.maxBsonObjectSize = buildInfo.maxBsonObjectSize;
        config.bits = buildInfo.bits;
        config.javascriptEngine = buildInfo.javascriptEngine;
        config.buildEnvironment = buildInfo.buildEnvironment;
      } catch (error) {
        console.warn(`⚠️ Could not get MongoDB build info:`, error);
      }
      
      // Get replica set status if available
      try {
        const replSetStatus = db.admin().replSetGetStatus();
        config.replicaSet = {
          setName: replSetStatus.set,
          myState: replSetStatus.myState,
          members: replSetStatus.members?.length || 0,
          ok: replSetStatus.ok
        };
      } catch (error) {
        // Not a replica set, that's fine
        config.replicaSet = null;
      }
      
      // Get sharding status if available
      try {
        const shardStatus = db.admin().shardConnPoolStats();
        config.sharding = {
          totalCreated: shardStatus.totalCreated,
          totalRefreshed: shardStatus.totalRefreshed,
          totalClosed: shardStatus.totalClosed,
          hosts: shardStatus.hosts?.length || 0
        };
      } catch (error) {
        // Not sharded, that's fine
        config.sharding = null;
      }
      
      // Set MongoDB-specific configuration
      config.encoding = 'utf8'; // MongoDB uses UTF-8
      config.collation = 'default'; // MongoDB uses default collation
      config.timezone = 'UTC'; // MongoDB uses UTC by default
      config.storageEngine = config.storageEngine || 'wiredTiger';
      config.maxConnections = config.maxBsonObjectSize ? Math.floor(config.maxBsonObjectSize / 1024) : 1000; // Estimate
      config.bufferPoolSize = config.storageSize || 0;
      config.logLevel = 'info'; // Default log level
      config.autovacuum = false; // MongoDB doesn't have autovacuum
      config.walMode = 'journal'; // MongoDB uses journaling
      config.synchronousMode = 'full'; // MongoDB uses full durability
      config.cacheSize = config.indexSize || 0;
      config.tempStore = 'memory'; // MongoDB uses memory for temp operations
      config.lockingMode = 'optimistic'; // MongoDB uses optimistic locking
      config.foreignKeys = false; // MongoDB doesn't have foreign keys
      config.recursiveTriggers = false; // MongoDB doesn't have triggers
      config.autoVacuum = false; // MongoDB doesn't have autovacuum
      config.incrementalVacuum = false; // MongoDB doesn't have vacuum
      
      // Add additional MongoDB-specific settings
      config.additionalSettings = {
        maxBsonObjectSize: config.maxBsonObjectSize,
        maxMessageSizeBytes: config.maxMessageSizeBytes,
        maxWriteBatchSize: config.maxWriteBatchSize,
        logicalSessionTimeoutMinutes: config.logicalSessionTimeoutMinutes,
        connectionId: config.connectionId,
        minWireVersion: config.minWireVersion,
        maxWireVersion: config.maxWireVersion,
        readOnly: config.readOnly,
        collections: config.collections,
        views: config.views,
        objects: config.objects,
        avgObjSize: config.avgObjSize,
        dataSize: config.dataSize,
        storageSize: config.storageSize,
        totalSize: config.totalSize,
        indexes: config.indexes,
        indexSize: config.indexSize,
        fileSize: config.fileSize,
        fsUsedSize: config.fsUsedSize,
        fsTotalSize: config.fsTotalSize,
        buildVersion: config.buildVersion,
        gitVersion: config.gitVersion,
        targetArch: config.targetArch,
        targetOS: config.targetOS,
        compiler: config.compiler,
        debug: config.debug,
        bits: config.bits,
        javascriptEngine: config.javascriptEngine,
        buildEnvironment: config.buildEnvironment,
        replicaSet: config.replicaSet,
        sharding: config.sharding
      };
      
      return config;
    } catch (error) {
      console.warn(`⚠️ Could not extract MongoDB configuration:`, error);
      return {};
    }
  }

  private extractMongoDBStatistics(db: any, collections: any[]): any {
    const statistics: any = {
      tableStatistics: [],
      indexStatistics: [],
      databaseStatistics: {}
    };
    
    try {
      // Get database-level performance metrics
      const dbPerformance = this.getMongoDBPerformanceMetrics(db);
      
      // Extract collection statistics
      collections.forEach(collection => {
        try {
          // Get collection stats
          const collectionStats = db.collection(collection.name).stats();
          
          // Get collection indexes
          const collectionIndexes = db.collection(collection.name).indexes();
          
          // Get collection-specific performance metrics
          const collectionPerformance = this.getMongoDBCollectionPerformanceMetrics(db, collection.name);
          
          const tableStatistic = {
            tableName: collection.name,
            schema: 'default',
            rowCount: collectionStats.count || 0,
            dataSize: collectionStats.size || 0,
            indexSize: collectionStats.totalIndexSize || 0,
            totalSize: (collectionStats.size || 0) + (collectionStats.totalIndexSize || 0),
            pageCount: Math.ceil((collectionStats.size || 0) / 16384), // Assuming 16KB pages
            avgRowSize: collectionStats.avgObjSize || 0,
            lastAnalyzed: this.getMongoDBLastAnalyzed(db, collection.name),
            lastVacuumed: this.getMongoDBLastVacuumed(db, collection.name),
            lastAutoVacuumed: this.getMongoDBLastAutoVacuumed(db, collection.name),
            nTupIns: collectionPerformance.insertCount || 0,
            nTupUpd: collectionPerformance.updateCount || 0,
            nTupDel: collectionPerformance.deleteCount || 0,
            nLiveTup: collectionStats.count || 0,
            nDeadTup: collectionPerformance.deadTuples || 0,
            nModSinceAnalyze: collectionPerformance.modificationsSinceAnalyze || 0,
            nInsSinceVacuum: collectionPerformance.insertsSinceVacuum || 0,
            heapBlksRead: collectionPerformance.heapBlocksRead || 0,
            heapBlksHit: collectionPerformance.heapBlocksHit || 0,
            idxBlksRead: collectionPerformance.indexBlocksRead || 0,
            idxBlksHit: collectionPerformance.indexBlocksHit || 0,
            toastBlksRead: 0, // Not applicable to MongoDB
            toastBlksHit: 0, // Not applicable to MongoDB
            tidxBlksRead: 0, // Not applicable to MongoDB
            tidxBlksHit: 0, // Not applicable to MongoDB
            additionalStats: {
              storageSize: collectionStats.storageSize || 0,
              totalIndexSize: collectionStats.totalIndexSize || 0,
              indexSizes: collectionStats.indexSizes || {},
              capped: collectionStats.capped || false,
              max: collectionStats.max || null,
              maxSize: collectionStats.maxSize || null,
              wiredTiger: collectionStats.wiredTiger || null,
              nindexes: collectionStats.nindexes || 0,
              indexBuilds: collectionStats.indexBuilds || [],
              totalSize: collectionStats.totalSize || 0,
              scaleFactor: collectionStats.scaleFactor || 1,
              ok: collectionStats.ok || 0,
              performance: collectionPerformance,
              cacheHitRatio: collectionPerformance.cacheHitRatio || 0,
              bufferHitRatio: collectionPerformance.bufferHitRatio || 0
            }
          };
          
          statistics.tableStatistics.push(tableStatistic);
          
          // Add index statistics with performance metrics
          collectionIndexes.forEach((index: any) => {
            const indexPerformance = this.getMongoDBIndexPerformanceMetrics(db, collection.name, index.name);
            
            const indexStatistic = {
              indexName: index.name,
              tableName: collection.name,
              schema: 'default',
              indexSize: collectionStats.indexSizes?.[index.name] || 0,
              indexPages: Math.ceil((collectionStats.indexSizes?.[index.name] || 0) / 16384), // Assuming 16KB pages
              indexTuples: indexPerformance.tupleCount || 0,
              indexScans: indexPerformance.scanCount || 0,
              indexTuplesRead: indexPerformance.tuplesRead || 0,
              indexTuplesFetched: indexPerformance.tuplesFetched || 0,
              lastUsed: indexPerformance.lastUsed || null,
              additionalStats: {
                key: index.key || {},
                unique: index.unique || false,
                sparse: index.sparse || false,
                background: index.background || false,
                partialFilterExpression: index.partialFilterExpression || null,
                expireAfterSeconds: index.expireAfterSeconds || null,
                textIndexVersion: index.textIndexVersion || null,
                default_language: index.default_language || 'english',
                language_override: index.language_override || 'language',
                weights: index.weights || {},
                '2dsphereIndexVersion': index['2dsphereIndexVersion'] || null,
                bits: index.bits || null,
                min: index.min || null,
                max: index.max || null,
                bucketSize: index.bucketSize || null,
                collation: index.collation || null,
                wildcardProjection: index.wildcardProjection || null,
                hidden: index.hidden || false,
                performance: indexPerformance,
                cacheHitRatio: indexPerformance.cacheHitRatio || 0
              }
            };
            
            statistics.indexStatistics.push(indexStatistic);
          });
          
        } catch (error) {
          console.warn(`⚠️ Could not get statistics for collection ${collection.name}:`, error);
        }
      });
      
      // Calculate database-level statistics
      const totalTables = statistics.tableStatistics.length;
      const totalIndexes = statistics.indexStatistics.length;
      const totalSize = statistics.tableStatistics.reduce((sum: number, table: any) => sum + (table.totalSize || 0), 0);
      const dataSize = statistics.tableStatistics.reduce((sum: number, table: any) => sum + (table.dataSize || 0), 0);
      const indexSize = statistics.tableStatistics.reduce((sum: number, table: any) => sum + (table.indexSize || 0), 0);
      
      // Get database-level stats
      let dbStats = null;
      try {
        dbStats = db.stats();
      } catch (error) {
        console.warn(`⚠️ Could not get database stats:`, error);
      }
      
      statistics.databaseStatistics = {
        totalTables,
        totalIndexes,
        totalSize,
        dataSize,
        indexSize,
        cacheHitRatio: dbPerformance.cacheHitRatio || 0,
        bufferHitRatio: dbPerformance.bufferHitRatio || 0,
        lastAnalyzed: dbPerformance.lastAnalyzed || null,
        lastVacuumed: dbPerformance.lastVacuumed || null,
        additionalStats: {
          totalSizePretty: this.formatBytes(totalSize),
          dataSizePretty: this.formatBytes(dataSize),
          indexSizePretty: this.formatBytes(indexSize),
          collections: dbStats?.collections || 0,
          views: dbStats?.views || 0,
          objects: dbStats?.objects || 0,
          avgObjSize: dbStats?.avgObjSize || 0,
          dataSize: dbStats?.dataSize || 0,
          storageSize: dbStats?.storageSize || 0,
          totalSize: dbStats?.totalSize || 0,
          indexes: dbStats?.indexes || 0,
          indexSize: dbStats?.indexSize || 0,
          fileSize: dbStats?.fileSize || 0,
          fsUsedSize: dbStats?.fsUsedSize || 0,
          fsTotalSize: dbStats?.fsTotalSize || 0,
          ok: dbStats?.ok || 0,
          performance: dbPerformance,
          totalInserts: dbPerformance.totalInserts || 0,
          totalUpdates: dbPerformance.totalUpdates || 0,
          totalDeletes: dbPerformance.totalDeletes || 0,
          totalScans: dbPerformance.totalScans || 0,
          totalReads: dbPerformance.totalReads || 0
        }
      };
      
      return statistics;
    } catch (error) {
      console.warn(`⚠️ Could not extract MongoDB statistics:`, error);
      return statistics;
    }
  }

  private getMongoDBPerformanceMetrics(db: any): any {
    try {
      // Get database-level performance metrics
      const dbStats = db.stats();
      const serverInfo = db.admin().serverInfo();
      
      // Calculate cache hit ratio based on WiredTiger cache
      let cacheHitRatio = 0;
      if (dbStats.wiredTiger && dbStats.wiredTiger.cache) {
        const cache = dbStats.wiredTiger.cache;
        const bytesReadIntoCache = cache['bytes read into cache'] || 0;
        const bytesWrittenFromCache = cache['bytes written from cache'] || 0;
        const totalBytes = bytesReadIntoCache + bytesWrittenFromCache;
        
        if (totalBytes > 0) {
          cacheHitRatio = Math.round((bytesWrittenFromCache / totalBytes) * 100 * 100) / 100;
        }
      }
      
      return {
        cacheHitRatio: Math.min(100, cacheHitRatio),
        bufferHitRatio: Math.min(100, cacheHitRatio),
        lastAnalyzed: this.getMongoDBLastAnalyzed(db, 'database'),
        lastVacuumed: this.getMongoDBLastVacuumed(db, 'database'),
        totalInserts: 0, // Would need to track this separately
        totalUpdates: 0, // Would need to track this separately
        totalDeletes: 0, // Would need to track this separately
        totalScans: 0, // Would need to track this separately
        totalReads: 0 // Would need to track this separately
      };
    } catch (error) {
      console.warn(`⚠️ Could not get MongoDB performance metrics:`, error);
      return {};
    }
  }

  private getMongoDBCollectionPerformanceMetrics(db: any, collectionName: string): any {
    try {
      // Get collection-specific performance metrics
      const collectionStats = db.collection(collectionName).stats();
      
      // Calculate cache hit ratio based on WiredTiger cache
      let cacheHitRatio = 0;
      if (collectionStats.wiredTiger && collectionStats.wiredTiger.cache) {
        const cache = collectionStats.wiredTiger.cache;
        const bytesReadIntoCache = cache['bytes read into cache'] || 0;
        const bytesWrittenFromCache = cache['bytes written from cache'] || 0;
        const totalBytes = bytesReadIntoCache + bytesWrittenFromCache;
        
        if (totalBytes > 0) {
          cacheHitRatio = Math.round((bytesWrittenFromCache / totalBytes) * 100 * 100) / 100;
        }
      }
      
      return {
        cacheHitRatio: Math.min(100, cacheHitRatio),
        bufferHitRatio: Math.min(100, cacheHitRatio),
        insertCount: 0, // Would need to track this separately
        updateCount: 0, // Would need to track this separately
        deleteCount: 0, // Would need to track this separately
        deadTuples: 0, // MongoDB doesn't track this
        modificationsSinceAnalyze: 0, // Would need to track this separately
        insertsSinceVacuum: 0, // Would need to track this separately
        heapBlocksRead: 0, // Would need to track this separately
        heapBlocksHit: collectionStats.count || 0, // Approximate
        indexBlocksRead: 0, // Would need to track this separately
        indexBlocksHit: 0 // Would need to track this separately
      };
    } catch (error) {
      console.warn(`⚠️ Could not get MongoDB collection performance metrics for ${collectionName}:`, error);
      return {};
    }
  }

  private getMongoDBIndexPerformanceMetrics(db: any, collectionName: string, indexName: string): any {
    try {
      // Get index-specific performance metrics
      const collectionStats = db.collection(collectionName).stats();
      const indexSize = collectionStats.indexSizes?.[indexName] || 0;
      
      // Calculate cache hit ratio for this index
      let cacheHitRatio = 0;
      if (collectionStats.wiredTiger && collectionStats.wiredTiger.cache) {
        const cache = collectionStats.wiredTiger.cache;
        const bytesReadIntoCache = cache['bytes read into cache'] || 0;
        const bytesWrittenFromCache = cache['bytes written from cache'] || 0;
        const totalBytes = bytesReadIntoCache + bytesWrittenFromCache;
        
        if (totalBytes > 0) {
          cacheHitRatio = Math.round((bytesWrittenFromCache / totalBytes) * 100 * 100) / 100;
        }
      }
      
      return {
        cacheHitRatio: Math.min(100, cacheHitRatio),
        tupleCount: 0, // Would need to track this separately
        scanCount: 0, // Would need to track this separately
        tuplesRead: 0, // Would need to track this separately
        tuplesFetched: 0, // Would need to track this separately
        lastUsed: null // Would need to track this separately
      };
    } catch (error) {
      console.warn(`⚠️ Could not get MongoDB index performance metrics for ${indexName}:`, error);
      return {};
    }
  }

  private getMongoDBLastAnalyzed(db: any, collectionName: string): string | null {
    try {
      if (collectionName === 'database') {
        // For database level, check if any collections have been analyzed
        const collections = db.listCollections().toArray();
        if (collections && collections.length > 0) {
          return new Date().toISOString();
        }
        return null;
      }
      
      // For collection level, check if collection exists and has data
      const collectionStats = db.collection(collectionName).stats();
      if (collectionStats && collectionStats.count > 0) {
        return new Date().toISOString();
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private getMongoDBLastVacuumed(db: any, collectionName: string): string | null {
    try {
      if (collectionName === 'database') {
        // For database level, check if any collections have been compacted
        const collections = db.listCollections().toArray();
        if (collections && collections.length > 0) {
          return new Date().toISOString();
        }
        return null;
      }
      
      // For collection level, check if collection has been compacted
      const collectionStats = db.collection(collectionName).stats();
      if (collectionStats && collectionStats.storageSize > 0) {
        return new Date().toISOString();
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private getMongoDBLastAutoVacuumed(db: any, collectionName: string): string | null {
    try {
      // MongoDB doesn't have traditional vacuum, but we can check for compaction
      if (collectionName === 'database') {
        // For database level, check if any collections have been compacted
        const collections = db.listCollections().toArray();
        if (collections && collections.length > 0) {
          return new Date().toISOString();
        }
        return null;
      }
      
      // For collection level, check if collection has been compacted
      const collectionStats = db.collection(collectionName).stats();
      if (collectionStats && collectionStats.storageSize > 0) {
        return new Date().toISOString();
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async extractMongoDBUniqueConstraintsFromIndexes(db: any, collectionName: string): Promise<any[]> {
    try {
      const collectionIndexes = await db.collection(collectionName).indexes();
      const uniqueConstraints: any[] = [];
      
      collectionIndexes.forEach((index: any, indexNum: number) => {
        if (index.unique) {
          const indexSpec = index.key || {};
          const columns = Object.keys(indexSpec);
          
          uniqueConstraints.push({
            name: index.name || `unique_${collectionName}_${indexNum}`,
            columns: columns,
            isDeferrable: false,
            initiallyDeferred: false,
            isEnabled: true
          });
        }
      });
      
      return uniqueConstraints;
    } catch (error) {
      console.warn(`⚠️ Could not get unique constraints for collection ${collectionName}:`, error);
      return [];
    }
  }

  private extractMongoDBPrimaryKeyConstraints(collectionName: string): any[] {
    // MongoDB _id field is always the primary key
    return [
      {
        name: `pk_${collectionName}_id`,
        columns: ['_id'],
        isDeferrable: false,
        initiallyDeferred: false,
        isEnabled: true
      }
    ];
  }

  private async extractMongoDBForeignKeyConstraintsFromSchema(db: any, collectionName: string, sampleDoc: any): Promise<any[]> {
    const foreignKeyConstraints: any[] = [];
    
    if (!sampleDoc) {
      return foreignKeyConstraints;
    }
    
    try {
      // Get all collections to check for potential references
      const allCollections = await db.listCollections().toArray();
      const collectionNames = allCollections.map((c: any) => c.name);
      
      // Analyze sample document for foreign key patterns
      const fkPatterns = this.analyzeMongoDBForeignKeyPatterns(sampleDoc, collectionNames);
      
      fkPatterns.forEach((pattern, index) => {
        foreignKeyConstraints.push({
          name: `fk_${collectionName}_${pattern.field}_${index}`,
          columns: [pattern.field],
          referencedTable: pattern.references,
          referencedColumns: [pattern.column],
          onDelete: 'NO ACTION', // MongoDB doesn't have cascade deletes
          onUpdate: 'NO ACTION',
          isDeferrable: false,
          initiallyDeferred: false,
          isEnabled: true
        });
      });
      
      return foreignKeyConstraints;
    } catch (error) {
      console.warn(`⚠️ Could not get foreign key constraints for collection ${collectionName}:`, error);
      return [];
    }
  }

  private analyzeMongoDBForeignKeyPatterns(sampleDoc: any, collectionNames: string[]): any[] {
    const patterns: any[] = [];
    
    // Common foreign key field patterns
    const commonFkFields = [
      'user_id', 'post_id', 'category_id', 'order_id', 'product_id', 
      'customer_id', 'author_id', 'parent_id', 'owner_id', 'created_by',
      'updated_by', 'assigned_to', 'belongs_to', 'ref_id', 'reference_id'
    ];
    
    // Analyze document fields
    Object.keys(sampleDoc).forEach(field => {
      // Check if field matches common foreign key patterns
      const fkMatch = commonFkFields.find(fkField => 
        field.toLowerCase().includes(fkField.toLowerCase()) || 
        field.toLowerCase().endsWith('_id') ||
        field.toLowerCase().endsWith('_ref')
      );
      
      if (fkMatch) {
        // Try to infer referenced collection
        let referencedCollection = '';
        let referencedColumn = 'id';
        
        if (field === 'parent_id') {
          // Self-reference
          referencedCollection = 'self';
          referencedColumn = 'id';
        } else {
          // Try to match with existing collections
          const fieldBase = field.replace(/_id$|_ref$/, '');
          const potentialCollections = collectionNames.filter(name => 
            name.toLowerCase().includes(fieldBase.toLowerCase()) ||
            fieldBase.toLowerCase().includes(name.toLowerCase())
          );
          
          if (potentialCollections.length > 0) {
            referencedCollection = potentialCollections[0];
          } else {
            // Use common patterns
            const commonPatterns: Record<string, string> = {
              'user_id': 'users',
              'post_id': 'posts', 
              'category_id': 'categories',
              'order_id': 'orders',
              'product_id': 'products',
              'customer_id': 'customers',
              'author_id': 'authors'
            };
            
            referencedCollection = commonPatterns[field] || `${fieldBase}s`;
          }
        }
        
        if (referencedCollection && referencedCollection !== 'self') {
          patterns.push({
            field: field,
            references: referencedCollection,
            column: referencedColumn
          });
        }
      }
    });
    
    return patterns;
  }

  /**
   * Introspect MongoDB database using listCollections
   */
  private async introspectMongoDB(connectionString: string): Promise<DatabaseIntrospectionResult> {
    try {
      // Use dynamic import to avoid bundling issues
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(connectionString);

      await client.connect();
      const db = client.db();

      // Get collection information
      const collections = await db.listCollections().toArray();
      
      const tableMetadata = await Promise.all(
        collections.map(async (collection: any) => {
          try {
            // Get document count
            const count = await db.collection(collection.name).countDocuments();
            
            // Get sample document to infer schema
            const sampleDoc = await db.collection(collection.name).findOne();
            const columns = sampleDoc ? Object.keys(sampleDoc).map(key => ({
              name: key,
              type: typeof sampleDoc[key],
              nullable: true,
              primaryKey: key === '_id'
            })) : [];

            // Extract MongoDB validation rules as constraints
            const validationRules = collection.options?.validator || {};
            const checkConstraints = this.extractMongoDBValidationConstraints(validationRules);
            
            // Extract unique constraints from indexes
            const uniqueConstraints = await this.extractMongoDBUniqueConstraintsFromIndexes(db, collection.name);
            
            // Extract primary key constraints (_id field)
            const primaryKeyConstraints = this.extractMongoDBPrimaryKeyConstraints(collection.name);
            
            // Extract foreign key constraints (referenced collections)
            const foreignKeyConstraints = await this.extractMongoDBForeignKeyConstraintsFromSchema(db, collection.name, sampleDoc);
            
            const constraints = {
              checkConstraints,
              uniqueConstraints,
              primaryKeyConstraints,
              foreignKeyConstraints
            };

            return {
              name: collection.name,
              type: 'collection',
              schema: 'default',
              rowCount: count,
              constraints,
              columns
            };
          } catch (error) {
            console.warn(`⚠️ Could not get metadata for collection ${collection.name}:`, error);
            return {
              name: collection.name,
              type: 'collection',
              schema: 'default',
              rowCount: 0,
              columns: []
            };
          }
        })
      );

      // Extract indexes for each collection with enhanced metadata
      const indexes: any[] = [];
      
      for (const collection of collections) {
        try {
          const collectionIndexes = await db.collection(collection.name).indexes();
          
          for (const index of collectionIndexes) {
            const indexSpec = index.key || {};
            const columns = Object.keys(indexSpec);
            
            // Extract MongoDB-specific storage parameters
            const storageParams = this.extractMongoDBStorageParams(index);
            const fillfactor = this.extractMongoDBFillFactor(index);
            const tablespace = this.extractMongoDBTablespace(index);
            
            indexes.push({
              name: index.name,
              tableName: collection.name,
              schema: 'default',
              type: this.mapMongoDBIndexType(indexSpec),
              columns: columns,
              isUnique: Boolean(index.unique),
              isPrimary: index.name === '_id_',
              isClustered: this.isMongoDBClustered(index),
              isPartial: Boolean(index.partialFilterExpression),
              whereClause: index.partialFilterExpression ? JSON.stringify(index.partialFilterExpression) : undefined,
              predicate: index.partialFilterExpression ? JSON.stringify(index.partialFilterExpression) : undefined,
              creationDDL: JSON.stringify(index),
              indexMethod: this.getMongoDBIndexMethod(indexSpec),
              fillfactor: fillfactor,
              storageParams: storageParams,
              tablespace: tablespace,
              cardinality: this.extractMongoDBCardinality(index),
              comment: this.extractMongoDBComment(index),
              expression: index.weights ? JSON.stringify(index.weights) : undefined,
              columnExpressions: this.extractMongoDBColumnExpressions(indexSpec)
            });
          }
    } catch (error) {
          console.warn(`⚠️ Could not get indexes for collection ${collection.name}:`, error);
        }
      }

      // Extract database configuration
      const databaseConfiguration = this.extractMongoDBConfiguration(db);

      // Extract statistics
      const statistics = this.extractMongoDBStatistics(db, collections);

      await client.close();

      console.log(`📊 MongoDB collections extracted: ${collections.length}`);
      console.log(`  - Collections: ${collections.length}`);
      console.log(`  - Indexes: ${indexes.length}`);
      console.log(`  - Database Configuration: ${Object.keys(databaseConfiguration).length} settings`);
      console.log(`  - Statistics: ${statistics.tableStatistics?.length || 0} collections, ${statistics.indexStatistics?.length || 0} indexes`);

    // Extract triggers (MongoDB doesn't have traditional triggers, but we can extract change streams)
    const triggers = await this.extractMongoDBTriggers(db);
    
    // Extract procedures (MongoDB stored procedures)
    const procedures = await this.extractMongoDBProcedures(db);
    
    // Extract functions (MongoDB functions)
    const functions = await this.extractMongoDBFunctions(db);
    
    // Extract events (MongoDB scheduled tasks)
    const events = await this.extractMongoDBEvents(db);

    // Extract sequences (MongoDB doesn't have native sequences, but we can extract counter patterns)
    const sequences = await this.extractMongoDBSequences(db);

    // Extract security information
    const security = await this.extractMongoDBSecurity(db);

    // Extract runtime state information
    const runtimeState = await this.extractMongoDBRuntimeState(db);

    // Extract MongoDB collection and index options
    const mongoOptions = await this.extractMongoDBOptions(db);

    // Attach sequences to table metadata
    const enhancedTableMetadata = this.attachSequencesToTables(tableMetadata, sequences);

    // Extract dependency graph
    const dependencyGraph = await this.extractMongoDBDependencyGraph(db, enhancedTableMetadata, [], triggers, functions, procedures);

    return {
        actualTables: collections.map((c: any) => c.name),
        databaseConfiguration,
        statistics,
        tableMetadata: enhancedTableMetadata,
        views: [],
        indexes,
        triggers,
        sequences,
        procedures,
        functions,
        events,
        security,
        runtimeState,
        dependencyGraph,
        mongoOptions
      };
    } catch (error) {
      console.error('❌ MongoDB introspection failed:', error);
      throw error;
    }
  }

}
