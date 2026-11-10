/**
 * Rutas de cuentas: /api/auth
 */
const express = require("express");
const authController = require("../controllers/authController");
const requireAuth = require("../middlewares/requireAuth");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);

module.exports = router;
