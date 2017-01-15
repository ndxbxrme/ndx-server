'use strict'

module.exports =
  PORT: process.env.PORT or 23232
  AWS_BUCKET: process.env.AWS_BUCKET
  AWS_REGION: process.env.AWS_REGION or 'us-east-1'
  AWS_ID: process.env.AWS_ID
  AWS_KEY: process.env.AWS_KEY
  SESSION_SECRET: process.env.SESSION_SECRET || 'thisismysecretdontforgetit'
