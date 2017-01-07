'use strict'

module.exports =
  PORT: process.env.PORT or 23232
  AWS_BUCKET: process.env.AWS_BUCKET
  AWS_REGION: process.env.AWS_REGION or 'us-east-1'
  AWS_ID: process.env.AWS_ID
  AWS_KEY: process.env.AWS_KEY
  SESSION_SECRET: process.env.SESSION_SECRET || 'thisismysecretdontforgetit'
  TWITTER_KEY: process.env.TWITTER_KEY
  TWITTER_SECRET: process.env.TWITTER_SECRET
  TWITTER_CALLBACK: process.env.TWITTER_CALLBACK
  FACEBOOK_KEY: process.env.FACEBOOK_KEY
  FACEBOOK_SECRET: process.env.FACEBOOK_SECRET
  FACEBOOK_CALLBACK: process.env.FACEBOOK_CALLBACK
  GITHUB_KEY: process.env.GITHUB_KEY
  GITHUB_SECRET: process.env.GITHUB_SECRET
  GITHUB_CALLBACK: process.env.GITHUB_CALLBACK
