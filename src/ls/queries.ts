import { IBaseQueries, ContextValue} from '@sqltools/types';
import queryFactory from '@sqltools/base-driver/dist/lib/factory';

const describeTable: IBaseQueries['describeTable'] = queryFactory`
  SELECT column_name AS name,
    data_type AS dataType,
    is_nullable AS isNullable,
    is_primary_key AS isPk
  FROM ${p => p.schema}.${p => p.table}.INFORMATION_SCHEMA.COLUMNS
  WHERE table_name = '${p => p.label}'
  ORDER BY ordinal_position
`;

const fetchColumns: IBaseQueries['fetchColumns'] = queryFactory`
  SELECT 
    column_name AS label,
    column_name AS name,
    data_type AS dataType,
    is_nullable AS isNullable,
    table_name AS table,
    table_schema AS schema,
    data_type AS detail,
    '${ContextValue.COLUMN}' as type
  FROM ${p => p.schema}.INFORMATION_SCHEMA.COLUMNS
  WHERE table_name = '${p => p.table}'
  ORDER BY ordinal_position
`;

// NB when you pass tables the parameters are different to when you pass schemas
const fetchRecords: IBaseQueries['fetchRecords'] = queryFactory`
  SELECT *
  FROM \`${p => p.table.schema}.${p => p.table.label}\`
  LIMIT ${p => p.limit || 50}
  OFFSET ${p => p.offset || 0}
`;

// NB when you pass tables the parameters are different to when you pass schemas
const countRecords: IBaseQueries['countRecords'] = queryFactory`
  SELECT COUNT(1) AS total
  FROM \`${p => p.table.schema}.${p => p.table.label}\`
`;

// BigQuery throws an error if you return an empty result set from the information schema
const fetchTablesAndViews = (
  type: ContextValue,
  tableType: string
): IBaseQueries['fetchTables'] => queryFactory`
-- check if there are any tables or views
IF (
  SELECT COUNT(*)
  FROM ${p=>p.schema}.INFORMATION_SCHEMA.TABLES
  WHERE table_type IN ${tableType}
  ) > 0 
-- if there are, return them
THEN
  SELECT 
    table_name AS label,
    table_name AS table,
    table_schema AS schema,
    '${type}' AS type
  FROM ${p=>p.schema}.INFORMATION_SCHEMA.TABLES
    WHERE table_type IN ${tableType}
    ORDER BY table_name;
-- otherwise return null
ELSE
  SELECT NULL;
END IF;
`;

const fetchTables: IBaseQueries['fetchTables'] = fetchTablesAndViews(ContextValue.TABLE,`('BASE TABLE', 'EXTERNAL')`);
const fetchViews: IBaseQueries['fetchTables'] = fetchTablesAndViews(ContextValue.VIEW, `('VIEW')`);

const searchTables: IBaseQueries['searchTables'] = queryFactory`
  SELECT table_name AS label,
    table_type AS type
  FROM ${p => p.table.schema}.INFORMATION_SCHEMA.TABLES
  WHERE LOWER(table_name) LIKE '%${p => p.search?.toLowerCase()}%'
  ORDER BY table_name
`;

const searchColumns: IBaseQueries['searchColumns'] = queryFactory`
  SELECT c.column_name AS label,
    c.table_name AS "table",
    c.data_type AS dataType,
    c.is_nullable AS isNullable,
    c.is_primary_key AS isPk,
    '${ContextValue.COLUMN}' as type
  FROM ${p => p.schema}.${p => p.table}.INFORMATION_SCHEMA.COLUMNS AS c
  WHERE 1 = 1
    ${p => p.tables.filter(t => !!t.label).length ? `AND LOWER(c.table_name) IN (${p.tables.filter(t => !!t.label).map(t => `'${t.label}'`.toLowerCase()).join(', ')})` : ''}
    ${p => p.search ? `AND (
      LOWER(c.table_name || '.' || c.column_name) LIKE '%${p.search.toLowerCase()}%'
      OR LOWER(c.column_name) LIKE '%${p.search.toLowerCase()}%'
    )` : ''}
  ORDER BY c.table_name ASC,
    c.ordinal_position ASC
  LIMIT ${p => p.limit || 100}
`;

const fetchSchemas: IBaseQueries['fetchSchemas'] = queryFactory`
  SELECT
    schema_name as label,
    schema_name as schema,
    '${ContextValue.SCHEMA}' as type,
    'schema' as detail,
    'group-by-ref-type' as iconId
  FROM INFORMATION_SCHEMA.SCHEMATA
`;

const fetchDatabases: IBaseQueries['fetchDatabases'] = queryFactory`
  SELECT
    catalog_name as label,
    catalog_name as database,
    '${ContextValue.DATABASE}' as type,
    'database' as detail
  FROM INFORMATION_SCHEMA.SCHEMATA
  GROUP BY catalog_name
`;

export default {
  describeTable,
  countRecords,
  fetchColumns,
  fetchRecords,
  fetchTables,
  fetchViews,
  fetchSchemas,
  fetchDatabases,
  searchTables,
  searchColumns,
  
}
