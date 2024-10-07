const functions = require('@google-cloud/functions-framework');

functions.http('helloHttp', (req, res) => {
  res.send(`Harsha Vardhan Says ${req.query.param}`);
});
