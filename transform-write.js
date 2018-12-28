const fs = require('fs');
const path = require('path');
const stringType = ['varchar', 'json', 'enum', 'char', 'text', 'nvarchar', 'character', 'nchar', 'varchar2' ,'nvarchar2', 'raw', 'binary', 'varbinary', 'tinytext', 'mediumtext', 'longtext'];
const numberType = `float double dec decimal numeric real number int int2 int4 int8 integer tinyint smallint mediumint bigint` .split(' ');
const dateType = `datetime datetime2 datetimeoffset time date year timestamp`.split(' ');

module.exports = function (options, path) {
  const { formName, table } = options;
  const { tableName, humpTableName } = formName;
  const entityName = tableName.replace(/_/g, '-') + '.entity.ts';
  let tsString = transformTsString(tableName, humpTableName[0].toUpperCase() + humpTableName.slice(1), table);
  const tableOptionString = new Uint8Array(Buffer.from(tsString));
  fs.writeFile(`${path}/${entityName}`, tableOptionString ,(err)=>{
    if (err) throw err;
    console.log(entityName + '文件已保存');
  });
};

function transformTsString(tableName, className, table){
  let str = '';
  for(let item of table){
    let column = item.primaryKey ? (item.dateBaseOption.generated ? 'PrimaryGeneratedColumn' : 'PrimaryColumn') : 'Column';
    const dataColumn = ['CreateDateColumn', 'UpdateDateColumn'];
    let type;
    if(stringType.includes(item.dateBaseOption.type)){    
      type = 'string';
    }else if(numberType.includes(item.dateBaseOption.type)){
      type = 'number';
    }else if(dateType.includes(item.dateBaseOption.type)){
      type = 'Date';
    }else {
      const err = `${tableName} ${item.name} ${item.dateBaseOption.type}没有找到数据库类型`
      throw new Error(err);
    }
    const optionStr = transhfromOptions(item);
    if(item.name === 'createdAt' && item.dateBaseOption.type === 'datetime'){
      column = dataColumn[0];
    }
    if(item.name === 'updatedAt' && item.dateBaseOption.type === 'datetime'){
      column = dataColumn[1];
    }
    str += transhfromColumn({ 
      columnType:column, 
      columnName:item.name,
      options: optionStr,
      indexKey: item.indexKey,
      type
    }) + `
    `;
  }
  let string = `
  import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm';
  @Entity({ name: '${tableName}' })
  export class ${className} {
  ${str}
  }
  `;
  return string;
}

function transhfromOptions(item){
  const start = '{', end =  ' }';
  let str = ''
  if(!item.dateBaseOption.generated){
    str += ` type: '${item.dateBaseOption.type}', `;
  } else {
    str += ` unsigned: true, `;
  }
  if(item.name !== item.field){
    str += `name: '${item.field}', `
  }
  if(item.unsigned){
    str += `unsigned: true, `
  }
  if(item.dateBaseOption.length){
    str += `length: ${item.dateBaseOption.length}, `
  }
  if(item.dateBaseOption.comment){
    str += `comment: '${item.dateBaseOption.comment}', `
  }
  if(item.dateBaseOption.defultValue){
    str += `default: '${item.dateBaseOption.defultValue}', `
  }
  return start + str.slice(0, -2) + end;
}

function transhfromColumn({columnType, columnName, options, type, indexKey}){
  const isNeed = ['PrimaryGeneratedColumn', 'PrimaryColumn'].includes(columnType) ? '':'?';

  let str = `
  `;
  const isIndex = indexKey ? 
  `@Index()
  `:'';
  const result = `@${columnType}(${options})
  ${columnName + isNeed}: ${type} ;`;
  return str + isIndex + result;
}