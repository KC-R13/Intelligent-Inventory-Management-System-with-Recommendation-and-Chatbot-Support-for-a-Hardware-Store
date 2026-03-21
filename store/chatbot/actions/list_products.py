from typing import Any, Text, Dict, List

from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher

from store.database.engine import Session
from store.database.schema import Product


class ActionListProducts(Action):
    def name(self) -> Text:
        return "action_list_products"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        lines = []
        with Session() as session:
            products = session.query(Product).limit(10).all()
            for p in products:
                lines.append(f"  • **{p.name}** — ${p.sell_price:.2f}")

        if lines:
            msg = (
                    f"**Latest Products** ({len(products)} items)\n\n"
                    + "\n".join(lines)
                    + "\n\nAsk me about pricing or availability for any item!"
            )
            dispatcher.utter_message(text=msg)
        else:
            dispatcher.utter_message(text="No products found in the inventory.")

        return []
