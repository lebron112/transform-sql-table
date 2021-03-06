const fs = require('fs');
const { writeFile, mapLimit } = require('./util');
const stringType = ['varchar', 'json', 'enum', 'char', 'text', 'nvarchar', 'character', 'nchar', 'varchar2', 'nvarchar2', 'raw', 'binary', 'varbinary', 'tinytext', 'mediumtext', 'longtext'];
const numberType = 'float double dec decimal numeric real number int int2 int4 int8 integer tinyint smallint mediumint bigint'.split(' ');
const dateType = 'datetime datetime2 datetimeoffset time date year timestamp'.split(' ');

module.exports = async function (options, path) {
  const { formName, table } = options;
  const { tableName, humpTableName } = formName;
  const entityName = tableName.replace(/_/g, '-') + '.entity.ts';
  let tsString = transformTsString(tableName, humpTableName[0].toUpperCase() + humpTableName.slice(1), table, formName.comment);
  await writeFile(`${path}/${entityName}`, tsString);
};

function transformTsString(tableName, className, table, tableCommit) {
  let str = '';
  for (let item of table) {
    let column = item.primaryKey ? (item.dateBaseOption.generated ? 'PrimaryGeneratedColumn' : 'PrimaryColumn') : 'Column';
    const dataColumn = ['CreateDateColumn', 'UpdateDateColumn'];
    let type;
    if (stringType.includes(item.dateBaseOption.type)) {
      type = 'string';
    } else if (numberType.includes(item.dateBaseOption.type)) {
      type = 'number';
    } else if (dateType.includes(item.dateBaseOption.type)) {
      type = 'Date';
    } else {
      const err = `${tableName} ${item.name} ${item.dateBaseOption.type}没有找到数据库类型`;
      throw new Error(err);
    }
    const optionStr = transhfromOptions(item);
    if (item.name === 'createdAt' && item.dateBaseOption.type === 'datetime') {
      column = dataColumn[0];
    }
    if (item.name === 'updatedAt' && item.dateBaseOption.type === 'datetime') {
      column = dataColumn[1];
    }
    if (item.dateBaseOption.comment) {
      str += `  
  /** ${item.dateBaseOption.comment} */`;
    }
    str +=
      transhfromColumn({
        columnType: column,
        columnName: item.name,
        options: optionStr,
        indexKey: item.indexKey,
        uniqueKey: item.uniqueKey,
        type
      }) +
      `
    `;
  }
  let string = `
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm';
/** ${tableCommit} */
@Entity({ name: '${tableName}' })
export class ${className}Entity {
${str}
}
// after copy user shift+alt+o to formatter code
  `;
  return string;
}

function transhfromOptions(item) {
  const start = '{',
    end = ' }';
  let str = '';
  if (!item.dateBaseOption.generated) {
    str += ` type: '${item.dateBaseOption.type}', `;
  } else {
    str += ' unsigned: true, ';
  }
  if (item.name !== item.field) {
    str += `name: '${item.field}', `;
  }
  if (item.unsigned) {
    str += 'unsigned: true, ';
  }
  if (item.dateBaseOption.length) {
    str += `length: ${item.dateBaseOption.length}, `;
  }
  if (item.dateBaseOption.precision) {
    str += `precision: ${item.dateBaseOption.precision}, `;
  }
  if (item.dateBaseOption.comment) {
    str += `comment: '${item.dateBaseOption.comment}', `;
  }
  if (item.dateBaseOption.defultValue) {
    str += `default: '${item.dateBaseOption.defultValue}', `;
  }
  return start + str.slice(0, -2) + end;
}

function transhfromColumn({ columnType, columnName, options, type, indexKey, uniqueKey }) {
  const isNeed = ['PrimaryGeneratedColumn', 'PrimaryColumn'].includes(columnType) ? '' : '?';

  let str = `
  `;

  const isIndex = indexKey || uniqueKey
    ? `
  @Index(${uniqueKey ? ' { unique: true }' : ''})` : '';
  const result = `@${columnType}(${options})`;
  const rt = `${isIndex}
  ${columnName + isNeed}: ${type};`;
  return str + result + rt;
}
