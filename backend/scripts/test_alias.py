from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class CountryBase(CamelModel):
    name: str
    is_public: Optional[bool] = False

# Test Parsing
try:
    # Test camelCase input
    data_camel = {"name": "Test1", "isPublic": True}
    obj1 = CountryBase(**data_camel)
    print(f"Input camelCase: {data_camel} -> is_public: {obj1.is_public} (Expected: True)")
    
    # Test snake_case input (populate_by_name=True)
    data_snake = {"name": "Test2", "is_public": True}
    obj2 = CountryBase(**data_snake)
    print(f"Input snake_case: {data_snake} -> is_public: {obj2.is_public} (Expected: True)")
    
    # Test dump
    print(f"Dump obj1 (by_alias=True): {obj1.model_dump(by_alias=True)} (Expected: isPublic: True)")
    print(f"Dump obj1 (by_alias=False): {obj1.model_dump(by_alias=False)} (Expected: is_public: True)")

except Exception as e:
    print(f"Error: {e}")
