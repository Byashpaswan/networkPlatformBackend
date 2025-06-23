#!/bin/bash
app_name=darwin
app_path=/var/www/darwin
app_length=$(pm2 list  | grep ${app_name} | wc -l)
cd ${app_path}
echo ${app_length}
echo ${app_path}
sudo chown -R ubuntu:ubuntu "${app_path}"
if [ "${app_length}" == 0 ]
then
  pm2 start --name "${app_name}" -i max bin/www
else
  pm2 restart "${app_name}"
fi

