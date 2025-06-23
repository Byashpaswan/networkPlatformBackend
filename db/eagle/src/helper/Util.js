exports.getConstLabel = ( obj ) =>{
  return Object.keys(obj ).map( ( key,index)=>{
    let  item = obj[key];
    return item.label;
  });
}

exports.getConstValue = (obj) => {
  return Object.keys(obj).map((key, index) => {
    let item = obj[key];
    return item.value;
  });
}

