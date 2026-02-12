const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// สร้าง sequelize แค่ครั้งเดียว
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../Database/database.sqlite'),
  logging: false
});

// เรียก Model แบบ function (ไม่ circular)
const Artist = require('./Artist')(sequelize, DataTypes);

// export รวมที่เดียว
module.exports = {
  sequelize,
  Artist
};