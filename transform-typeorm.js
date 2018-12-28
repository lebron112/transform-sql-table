const fs = require('fs');
const path = require('path');
const writeFunc = require('./transform-write');

readTableConfig();

function readTableConfig(){
  
  const Path = require('path');
  try {
    fs.statSync(Path.join(__dirname,'sql'));
  }catch(e){
    fs.mkdirSync(Path.join(__dirname,'sql'))
  }
  const path = Path.join(__dirname,'./sql');
  const dir = fs.readdirSync(Path.join(__dirname,'./sql'));
  try {
    fs.statSync(Path.join(__dirname,'options'));
  }catch(e){
    fs.mkdirSync(Path.join(__dirname,'options'))
  }

  try {
    fs.statSync(Path.join(__dirname,'typeorm-model'));
  }catch(e){
    fs.mkdirSync(Path.join(__dirname,'typeorm-model'))
  }

  for(let i = 0; i < dir.length; i ++){
    const filePath = Path.join(__dirname + `/sql/${dir[i]}`);
    const fileResult = fs.readFileSync(filePath, { encoding: 'utf8' }).trim();
    const sqlList = fileResult.split('\n').map(item => item.trim());
    const result = {};
    const last = sqlList.pop();
    result.formName = getTableName(sqlList.shift());
    result.formName.comment = getComment(last); 
    result.table = transformTableName(sqlList, result.formName);
    const tableOptionString = new Uint8Array(Buffer.from(JSON.stringify(result,null,'\t')));
    fs.writeFile(`./options/${result.formName.humpTableName}.json`, tableOptionString ,(err)=>{
      if (err) throw err;
      // console.log(result.formName.humpTableName + '已保存');
    });
    writeFunc(result, './typeorm-model');
  }
}

function getComment( str) {
  str = str.match(/comment=.+/gi,'');
  if(str){
    return str[0].replace(/\'|comment=/gi,'').slice(0, -1);
  }
}

function getTableName(str) {
  const tableName = str.split(' ')[2].replace(/\`/g, '');
  return {
    tableName,
    humpTableName: transformHump(tableName)
  
  }
}


function transformHump(str) {
  str = str.split('_');
  return str.map((item, index) => {
    const word = item.slice(1);
    let first = item[0];
    return index !== 0 ? (first.toUpperCase() + word) : item;
  }).join('');
}

function transformTableName(list, tableName) {
  const result = [];
  let primaryKeys = [];
  let uniqueKeys = [];
  let indexKeys = [];
  for (let i = 0; i < list.length; i++) {
    const table = {};
    const item = list[i];
    if (item.startsWith('`')) { //`
      const name = item.match(/^`[a-zA-Z_0-9]+`/)[0].replace(/\`/g, '');
      table.name = transformHump(name);
      table.field = name;
      table.dateBaseOption = checkoutDateBaseOptions(item);
      table.unsigned = /unsigned/i.test(item) ? true : undefined;
      result.push(table);
    } else if (item.startsWith('PRIMARY')) {
      const name = item.match(/`[a-zA-Z_0-9]+`/g);
      primaryKeys = name.map(item => item.replace(/\`/g, ''));//`
    }
    if (/AUTO_INCREMENT/.test(item)) {
      table.dateBaseOption.generated = true;
    } else if (/^UNIQUE KEY/.test(item.trim())) {
      let list = item.match(/\(.+\)/g);
      list && (list = list.map(item => {
        item = item.replace(/[()`]/g, '');//`
        return item;
      }));
      uniqueKeys = uniqueKeys.concat(list[0].split(','));
    } else if (/^KEY/.test(item.trim())) {
      let list = item.match(/\(.+\)/g);
      list && (list = list.map(item => {
        item = item.replace(/[()`]/g, '');
        return item;
      }));
      indexKeys = indexKeys.concat(list[0].split(','));
    }
  }
  result.forEach(item => {
    primaryKeys.forEach(i => {
      if (item.field === i) {
        item.primaryKey = true;
      }
    });
    uniqueKeys.forEach(i => {
      if (item.field === i) {
        item.uniqueKey = true;
      }
    });
    indexKeys.forEach(i => {
      if (item.field === i) {
        item.indexKey = true;
      }
    });
  });
  return result;
}

function checkoutDateBaseOptions(str) {
  const arr = str.replace(/\'/g, '').replace(/\,$/, '').split(' ');
  const type = arr[1].trim().replace(/\([0-9,a-zA-Z_]+\)/g, '');
  const length = arr[1].match(/[0-9]+/g);
  let defultValue, notValue, comment;
  arr.forEach((item, index) => {
    let value;
    if (item.trim() === 'DEFAULT') {
      value = arr[index + 1];
      value && value !== 'NULL' && value !== 'CURRENT_TIMESTAMP' && (defultValue = value);
    } else if (item.trim() === 'NOT') {
      value = arr[index + 1];
      value && (notValue = value === 'NULL' ? null : undefined);
    } else if (item.trim() === 'COMMENT') {
      value = arr.slice(index + 1).join('');
      value && (comment = value);
    }
  });
  return {
    type, comment,
    defultValue, notValue,
    length: (type === 'varchar' || type === 'decimal') && length ? (length[0] ? length[0] : null) : null
  };
}



