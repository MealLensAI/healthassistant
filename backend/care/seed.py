from .db import get_store


def main() -> None:
    store = get_store()
    state = store.reset()
    print(f"Seeded {len(state['users'])} users and {len(state['dietitians'])} dietitians.")


if __name__ == "__main__":
    main()
