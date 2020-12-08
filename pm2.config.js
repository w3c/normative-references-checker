module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [
    {
      name      : 'normative-references',
      script    : 'serve.js',
      env: {
        NODE_ENV: 'production',
        PORT    : 5000
      },
      error_file : "/var/log/nodejs/normative-references.err",
      out_file   : "/var/log/nodejs/normative-references.log",
      "node_args": "--max_old_space_size=400"
    }
  ]
};
