const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization; 

  if (!authHeader) {
    return res.status(401).json({ message: "Token missing" });
  }

  const token = authHeader.split(" ")[1]; // Bearer TOKEN

  try {
    const decoded = jwt.verify(token, process.env.JWt_Secret); //1 object return yeto
    req.user = decoded; // user info attach
    next(); //Middleware complete → पुढच्या middleware किंवा route handler कडे request पाठवतो
  } catch (err) {
    res.status(401).json({ message: "Invalid token" }); //Response तयार करून client ला पाठवतो, request end होतो
  }
};

exports.sendReq =  (req, res) => {
  res.json({
    message: "Welcome to profile",
    user: req.user
  });
}