(function() {
  'use strict';
  module.exports = {
    AUTO_RESTART: process.env.AUTO_RESTART || true,
    PORT: process.env.PORT || 23232,
    SSL_PORT: process.env.SSL_PORT,
    AWS_BUCKET: process.env.AWS_BUCKET,
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    AWS_ID: process.env.AWS_ID,
    AWS_KEY: process.env.AWS_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET || 'thisismysecretdontforgetit',
    IP_ENCRYPT: process.env.IP_ENCRYPT,
    AUTO_ID: process.env.AUTO_ID || '_id',
    USER_TABLE: process.env.USER_TABLE || 'users',
    AUTO_LOAD_MODULES: true,
    DO_NOT_LOG: process.env.DO_NOT_LOG,
    LOG_TO_SCREEN: process.env.LOG_TO_SCREEN,
    LOG_DIR: process.env.LOG_DIR || 'logs',
    LOG_LEVEL: process.env.LOG_LEVEL || 'short',
    CLUSTER: process.env.CLUSTER,
    CLUSTER_MAX: process.env.CLUSTER_MAX || require('os').cpus().length,
    CLUSTER_HOST: process.env.CLUSTER_HOST || 'localhost',
    CLUSTER_PORT: process.env.CLUSTER_PORT || 23233
  };

}).call(this);

//# sourceMappingURL=settings.js.map
