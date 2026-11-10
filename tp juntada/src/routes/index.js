/**
 * Todas las rutas de la API, montadas en /api.
 */
const express = require("express");
const authRoutes = require("./authRoutes");
const eventRoutes = require("./eventRoutes");
const requireAuth = require("../middlewares/requireAuth");
const { apiNotFound } = require("../middlewares/errorHandler");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/events", requireAuth, eventRoutes);
router.use(apiNotFound);

module.exports = router;
