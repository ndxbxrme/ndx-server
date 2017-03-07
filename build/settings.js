(function() {
  'use strict';
  module.exports = {
    PORT: process.env.PORT || 23232,
    SSL_PORT: process.env.SSL_PORT,
    AWS_BUCKET: process.env.AWS_BUCKET,
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    AWS_ID: process.env.AWS_ID,
    AWS_KEY: process.env.AWS_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET || 'thisismysecretdontforgetit',
    IP_ENCRYPT: process.env.IP_ENCRYPT,
    AUTO_ID: process.env.AUTO_ID || '_id',
    USER_TABLE: process.env.USER_TABLE || 'users'
  };

}).call(this);

//# sourceMappingURL=settings.js.map
