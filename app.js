const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const db = require("./db");

const app = express();

// Middleware
app.use(bodyParser.json());

// Create schools table if not exists
const createSchoolsTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS schools (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(255) NOT NULL,
      latitude FLOAT NOT NULL,
      longitude FLOAT NOT NULL
    )
  `;
  try {
    await db.query(createTableQuery);
    console.log("Schools table ensured");
  } catch (error) {
    console.error("Error creating schools table:", error);
  }
};

createSchoolsTable();

// Add School API
app.post("/addSchool", async (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  // Validation
  if (
    !name ||
    !address ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return res.status(400).json({ error: "Invalid input data" });
  }

  try {
    const insertQuery =
      "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)";
    const [result] = await db.query(insertQuery, [
      name,
      address,
      latitude,
      longitude,
    ]);
    res.status(201).json({ message: "School added", schoolId: result.insertId });
  } catch (error) {
    console.error("Error adding school:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Helper function to calculate distance between two coordinates using Haversine formula
const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Radius of Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// List Schools API
app.get("/listSchools", async (req, res) => {
  const userLat = parseFloat(req.query.latitude);
  const userLon = parseFloat(req.query.longitude);

  if (isNaN(userLat) || isNaN(userLon)) {
    return res.status(400).json({ error: "Invalid or missing latitude/longitude" });
  }

  try {
    const [schools] = await db.query("SELECT * FROM schools");

    // Calculate distance for each school
    const schoolsWithDistance = schools.map((school) => {
      const distance = getDistance(
        userLat,
        userLon,
        school.latitude,
        school.longitude
      );
      return { ...school, distance };
    });

    // Sort by distance
    schoolsWithDistance.sort((a, b) => a.distance - b.distance);

    res.json(schoolsWithDistance);
  } catch (error) {
    console.error("Error fetching schools:", error);
    res.status(500).json({ error: "Database error" });
  }
});

  
// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
