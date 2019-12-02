const Path = require('path');
const fs = require('fs');
const { writeFile, mapLimit } = require('./util');
const writeFunc = require('./transform-write');
async function readTableConfig() {
  try {
    fs.statSync(Path.join(__dirname, 'sql'));
  } catch (e) {
    fs.mkdirSync(Path.join(__dirname, 'sql'));
  }
  try {
    fs.statSync(Path.join(__dirname, 'options'));
  } catch (e) {
    fs.mkdirSync(Path.join(__dirname, 'options'));
  }
  try {
    fs.statSync(Path.join(__dirname, 'typeorm-model'));
  } catch (e) {
    fs.mkdirSync(Path.join(__dirname, 'typeorm-model'));
  }
  const dir = fs.readdirSync(Path.join(__dirname, './sql'));
  return await new Promise(resolve => {
    mapLimit(
      dir,
      20,
      async item => {
        const filePath = Path.join(__dirname + `/sql/${item}`);
        const fileResult = fs.readFileSync(filePath, { encoding: 'utf8' }).trim();
        const sqlList = fileResult.split('\n').map(items => items.trim());
        const result = {};
        const last = sqlList.pop();
        result.formName = getTableName(sqlList.shift());
        result.formName.comment = getComment(last);
        result.table = transformTableName(sqlList, result.formName);
        const string = new Uint8Array(Buffer.from(JSON.stringify(result, null, '\t')));
        await writeFile(`./options/${result.formName.humpTableName}.json`, string, true);
        await writeFunc(result, './typeorm-model');
      },
      resolve
    );
  });
}

function getComment(str) {
  str = str.match(/comment=.+/gi, '');
  if (str) {
    return str[0].replace(/'|comment=/gi, '').slice(0, -1);
  }
}

function getTableName(str) {
  const tableName = str.split(' ')[2].replace(/`/g, '');
  return {
    tableName,
    humpTableName: transformHump(tableName)
  };
}

function transformHump(str) {
  str = str.split('_');
  return str
    .map((item, index) => {
      const word = item.slice(1);
      let first = item[0];
      return index !== 0 ? first.toUpperCase() + word : item;
    })
    .join('');
}

function transformTableName(list) {
  const result = [];
  let primaryKeys = [];
  let uniqueKeys = [];
  let indexKeys = [];
  let indexList = [];
  for (let i = 0; i < list.length; i++) {
    const table = {};
    const item = list[i];
    if (item.startsWith('`')) {
      const name = item.match(/^`[a-zA-Z_0-9]+`/)[0].replace(/`/g, '');
      table.name = name[0] !== '_' ? transformHump(name) : name;
      table.field = name;
      table.dateBaseOption = checkoutDateBaseOptions(item);
      table.unsigned = /unsigned/i.test(item) ? true : undefined;
      result.push(table);
    } else if (item.startsWith('PRIMARY')) {
      const name = item.match(/`[a-zA-Z_0-9]+`/g);
      primaryKeys = name.map(item => item.replace(/`/g, '')); //`
    }
    if (/AUTO_INCREMENT/.test(item)) {
      table.dateBaseOption.generated = true;
    } else if (/^UNIQUE KEY/.test(item.trim())) {
      let list = item.match(/\(.+\)/g);
      // try{
      //   console.log(checkoutIndexKey(item.trim(), list));
      // }catch(e){}
      
      list &&
        (list = list.map(item => {
          item = item.replace(/[()`]/g, ''); //`
          return item;
        }));
      indexList = indexList.concat();
      uniqueKeys = uniqueKeys.concat(list[0].split(','));
    } else if (/^KEY/.test(item.trim())) {
      let list = item.match(/\(.+\)/g);
      // try{
      //   console.log(checkoutIndexKey(item.trim(), list));
      // }catch(e){}
      list &&
        (list = list.map(item => {
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
  const arr = str
    .replace(/'/g, '')
    .replace(/,$/, '')
    .split(' ');
  const type = arr[1].trim().replace(/\([0-9,a-zA-Z_]+\)/g, '');
  const length = arr[1].match(/[0-9]+/g);
  let defultValue, notValue, comment, nullable;
  arr.forEach((item, index) => {
    let value;
    if (item.trim() === 'DEFAULT') {
      value = arr[index + 1];
      if(value){
        if(value !== 'NULL' && value !== 'CURRENT_TIMESTAMP'){
          defultValue = value;
        }else if(value === 'NULL'){
          nullable = true;
        }
      }
    } else if (item.trim() === 'NOT') {
      value = arr[index + 1];
      value && (notValue = value === 'NULL' ? null : undefined);
    } else if (item.trim() === 'COMMENT') {
      value = arr.slice(index + 1).join('');
      value && (comment = value);
    }
  });
  return {
    type,
    comment,
    defultValue,
    nullable,
    notValue,
    length: (type === 'varchar' || type === 'decimal') && length ? (length[0] ? length[0] : null) : null
  };
}

// function checkoutIndexKey(str, key) {
//   if (str && key) {
//     return str.replace(new RegExp(key[0].replace('(', '\\(').replace(')', '\\)'), 'g'), '')
//       .replace(/^UNIQUE KEY/, '')
//       .replace(/^KEY/, '')
//       .replace(/`/g, '').trim();
//   }
// }

module.exports = readTableConfig;
