
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def test_hash():
    password = "short_password"
    print(f"Hashing password: '{password}' (len={len(password)})")
    try:
        hashed = pwd_context.hash(password)
        print(f"Hash success: {hashed}")
    except Exception as e:
        print(f"Hash FAILED: {e}")

    try:
        # Test the explicit one from user screenshot if I can read it: fLxHRSB3LT3
        p2 = "fLxHRSB3LT3" 
        hashed2 = pwd_context.hash(p2)
        print(f"Hash user password success: {hashed2}")
    except Exception as e:
        print(f"Hash user password FAILED: {e}")

if __name__ == "__main__":
    test_hash()
