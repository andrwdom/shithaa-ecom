// Lightweight idempotency helpers (used where appropriate)
module.exports = {
  isDuplicateKeyError(err) {
    return err && err.code === 11000;
  }
};


