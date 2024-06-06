const { Sequelize, DataTypes } = require("sequelize");

// define a new table 'users'
const schema = {
  Admin: {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
      allowNull: false,
    },
  },
  Numbers: {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    profileId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    e164: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    display: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
      allowNull: false,
    },
  },
  Threads: {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    numberId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    number: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    recipients: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    count: { 
      type: DataTypes.INTEGER, 
      defaultValue: 1,
      autoIncrement: true 
    },
  },
  Permissions: {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    adminId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    attribute: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    attributeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    allow: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
    },
  },
  Messages: {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    threadId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sender: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recipient: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    content: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
    },
  },
};

module.exports = schema;
