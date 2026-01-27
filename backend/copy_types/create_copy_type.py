import argparse
import sys
sys.path.append('..')
from conn import get_supabase_client


def create_copy_type(data: dict):
    client = get_supabase_client()
    response = client.table("copy_types").insert(data).execute()
    return response.data[0]


def main(code: str, name: str, description: str, core_concept: str, example_copy: str, prompt_template: str):
    data = {
        "code": code,
        "name": name,
        "description": description,
        "core_concept": core_concept,
        "example_copy": example_copy,
        "prompt_template": prompt_template,
    }
    result = create_copy_type(data)
    print(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a new copy type")
    parser.add_argument("--code", required=True, help="Copy type code")
    parser.add_argument("--name", required=True, help="Copy type name")
    parser.add_argument("--description", required=True, help="Description")
    parser.add_argument("--core-concept", required=True, help="Core concept")
    parser.add_argument("--example-copy", required=True, help="Example copy")
    parser.add_argument("--prompt-template", required=True, help="Prompt template")
    args = parser.parse_args()

    main(args.code, args.name, args.description, args.core_concept, args.example_copy, args.prompt_template)
