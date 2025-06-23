#!/bin/bash

#rsync -avzh  /var/www/darwin/ /darwin_efs/code/
if [ -d ".git" ]; then
  echo ".git directory exists."
  rsync -avzh --exclude '.git/' --exclude 'node_modules/' /var/www/darwin/ /darwin_efs/darwin/
else
  echo ".git directory does not exist."
fi
