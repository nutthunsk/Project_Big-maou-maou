const express = require('express');
const path = require('path');

const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .catch(err => console.error('DB error:', err));
sequelize.sync()
  .catch(err => console.error(err));

// middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const artistRoutes = require('./routes/artist.routes');
app.use('/artists', artistRoutes);

// view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// test route
app.get('/', (req, res) => {
  res.send('Big maou maou is running ');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});