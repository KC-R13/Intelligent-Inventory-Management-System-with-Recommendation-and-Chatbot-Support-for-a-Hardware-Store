from typing import Any, Text, Dict, List

from rasa_sdk import Action, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher

from .utils import find_product


class ActionCheckAvailability(Action):
    def name(self) -> Text:
        return "action_check_availability"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        product_name = tracker.get_slot("product_name")
        if not product_name:
            for ent in tracker.latest_message.get("entities", []):
                if ent.get("entity") == "product_name":
                    product_name = ent.get("value")
                    break

        if not product_name:
            dispatcher.utter_message(text="Which product would you like to check?")
            return []

        product = find_product(product_name)
        if not product:
            dispatcher.utter_message(
                text=f"I couldn't find **'{product_name}'** in our inventory. "
                     "Could you try a different name?"
            )
            return []

        msg = (
            f"**{product.name}** is available!\n"
            f"Price: ${product.sell_price:.2f} per unit"
        )

        dispatcher.utter_message(text=msg)
        return [SlotSet("product_name", product.name)]
