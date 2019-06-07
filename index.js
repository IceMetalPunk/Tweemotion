const dotenv = require('dotenv').config();
const express = require('express');
const server = express();

const PORT = process.env.PORT || 8080;
server.use(express.static('public'));

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});