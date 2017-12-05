export PATH=/usr/local/node/node-default/bin:/usr/sbin:$PATH
export NODE_ENV=production

nohup node serve.js 2>&1 1>$HOME/normative-references.log &
