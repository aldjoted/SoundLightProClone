"""
Standalone script to read and display categories from productscategory.json
Can be run directly: python read_categories.py
"""
import json
import os


def read_categories_json(json_file_path):
    """
    Read and parse the productscategory.json file.
    Returns the parsed data or None if there's an error.
    """
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        print(f"❌ Error: File not found at {json_file_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON format - {str(e)}")
        return None
    except Exception as e:
        print(f"❌ Error reading file: {str(e)}")
        return None


def display_categories(data, indent=0):
    """
    Recursively display categories and subcategories in a tree structure.
    """
    if not data:
        return
    
    categories = data.get('categories', [])
    
    for category in categories:
        prefix = "  " * indent
        print(f"{prefix}📁 {category['name']} (id: {category['id']})")
        
        subcategories = category.get('subcategories', [])
        if subcategories:
            display_subcategories(subcategories, indent + 1)


def display_subcategories(subcategories, indent=0):
    """
    Display subcategories recursively.
    """
    for subcat in subcategories:
        prefix = "  " * indent
        print(f"{prefix}📂 {subcat['name']} (id: {subcat['id']})")
        
        nested_subcats = subcat.get('subcategories', [])
        if nested_subcats:
            display_subcategories(nested_subcats, indent + 1)


def get_category_statistics(data):
    """
    Calculate statistics about categories.
    """
    if not data:
        return None
    
    categories = data.get('categories', [])
    
    total_main_categories = len(categories)
    total_subcategories = 0
    total_nested = 0
    
    for category in categories:
        subcats = category.get('subcategories', [])
        total_subcategories += len(subcats)
        
        for subcat in subcats:
            nested = subcat.get('subcategories', [])
            total_nested += len(nested)
    
    return {
        'main_categories': total_main_categories,
        'subcategories': total_subcategories,
        'nested_subcategories': total_nested,
        'total': total_main_categories + total_subcategories + total_nested
    }


def main():
    """
    Main function to read and display categories.
    """
    # Get the path to the JSON file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_file_path = os.path.join(
        script_dir,
        'api',
        'migrations',
        'productscategory.json'
    )
    
    print("=" * 60)
    print("📋 Product Categories Reader")
    print("=" * 60)
    print(f"Reading from: {json_file_path}\n")
    
    # Read the JSON file
    data = read_categories_json(json_file_path)
    
    if not data:
        return
    
    # Display statistics
    stats = get_category_statistics(data)
    if stats:
        print("📊 Category Statistics:")
        print(f"   Main Categories: {stats['main_categories']}")
        print(f"   Subcategories: {stats['subcategories']}")
        print(f"   Nested Subcategories: {stats['nested_subcategories']}")
        print(f"   Total Categories: {stats['total']}\n")
    
    # Display the category tree
    print("🌳 Category Tree:")
    print("-" * 60)
    display_categories(data)
    print("-" * 60)
    
    print("\n✅ Categories loaded successfully!")


if __name__ == '__main__':
    main()
