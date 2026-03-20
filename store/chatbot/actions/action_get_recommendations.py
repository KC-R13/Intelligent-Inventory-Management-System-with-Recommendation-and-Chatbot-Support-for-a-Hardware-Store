from typing import Any, Text, Dict, List

from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher

from store.database.engine import Session
from store.database.schema import Product, Recommendation


REC_TYPE_LABELS = {
    "high_selling": "High Selling",
    "low_selling": "Low Selling",
    "overstocked": "Overstocked",
    "understocked": "Low Stock",
    "high_profit": "High Profit",
    "restock_alert": "Restock Alert",
}


class ActionGetRecommendations(Action):
    def name(self) -> Text:
        return "action_get_recommendations"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        with Session() as session:
            # Get the top-scored recommendations, one per product, favouring high_selling and high_profit
            recs = (
                session.query(Recommendation, Product)
                .join(Product, Recommendation.product_id == Product.id)
                .filter(
                    Recommendation.rec_type.in_(["high_selling", "high_profit"]),
                    Product.is_active == True,
                )
                .order_by(Recommendation.score.desc())
                .limit(5)
                .all()
            )

            if not recs:
                # Fall back to any recommendation type if no high_selling/high_profit found
                recs = (
                    session.query(Recommendation, Product)
                    .join(Product, Recommendation.product_id == Product.id)
                    .filter(Product.is_active == True)
                    .order_by(Recommendation.score.desc())
                    .limit(5)
                    .all()
                )

            if not recs:
                dispatcher.utter_message(
                    text="No recommendations available right now. Try browsing our products instead!"
                )
                return []

            lines = []
            for rec, product in recs:
                label = REC_TYPE_LABELS.get(rec.rec_type, rec.rec_type)
                line = f"  • {label} — **{product.name}** (${product.sell_price:.2f})"
                if rec.reason:
                    line += f"\n    _{rec.reason}_"
                lines.append(line)

            msg = (
                "**Recommended Products**\n\n"
                + "\n".join(lines)
                + "\n\nWant more details or pricing on any of these?"
            )
            dispatcher.utter_message(text=msg)

        return []