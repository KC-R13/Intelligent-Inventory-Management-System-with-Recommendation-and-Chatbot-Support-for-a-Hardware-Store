from typing import Any, Text, Dict, List

from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher

from store.database.engine import Session
from store.database.schema import Product, Category


class ActionListByCategory(Action):
    def name(self) -> Text:
        return "action_list_by_category"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        category_name = tracker.get_slot("category")
        if not category_name:
            for ent in tracker.latest_message.get("entities", []):
                if ent.get("entity") == "category":
                    category_name = ent.get("value")
                    break

        if not category_name:
            dispatcher.utter_message(text="Which category are you interested in? For example: power tools, hand tools, electrical, plumbing, safety, or building materials.")
            return []

        with Session() as session:
            category = (
                session.query(Category)
                .filter(Category.name.ilike(f"%{category_name}%"))
                .first()
            )

            if not category:
                dispatcher.utter_message(
                    text=f"I couldn't find a category matching **'{category_name}'**.\n\n"
                         "Available categories include: power tools, hand tools, electrical, plumbing, safety, building materials."
                )
                return []

            products = (
                session.query(Product)
                .filter(Product.category_id == category.id, Product.is_active == True)
                .limit(10)
                .all()
            )

            if not products:
                dispatcher.utter_message(
                    text=f"No products found in the **{category.name}** category right now."
                )
                return []

            lines = [
                f"  • **{p.name}** — ${p.sell_price:.2f}"
                for p in products
            ]
            msg = (
                f"**{category.name}** ({len(products)} items)\n\n"
                + "\n".join(lines)
                + "\n\nAsk me about any of these products for more details!"
            )
            dispatcher.utter_message(text=msg)

        return []