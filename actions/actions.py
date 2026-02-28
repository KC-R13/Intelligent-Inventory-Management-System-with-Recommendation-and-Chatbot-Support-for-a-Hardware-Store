"""
BuildPro Hardware Store - Rasa Custom Actions
Inventory Management Chatbot Actions
"""

from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import difflib

# ─────────────────────────────────────────────
#  INVENTORY DATABASE
#  In production, replace with DB calls (PostgreSQL, MongoDB, etc.)
# ─────────────────────────────────────────────

INVENTORY = {
    # ── POWER TOOLS ──────────────────────────────────────────────────────────
    "dewalt drill": {
        "name": "DeWalt 20V Cordless Drill",
        "category": "Power Tools",
        "sku": "DWT-001",
        "price": 89.99,
        "stock": 24,
        "unit": "piece",
        "description": "20V MAX Cordless Drill/Driver, 2-speed, includes 2 batteries",
    },
    "circular saw": {
        "name": "Makita 7-1/4\" Circular Saw",
        "category": "Power Tools",
        "sku": "MAK-002",
        "price": 129.99,
        "stock": 12,
        "unit": "piece",
        "description": "15-amp motor, 5800 RPM, built-in dust blower",
    },
    "angle grinder": {
        "name": "Bosch 4-1/2\" Angle Grinder",
        "category": "Power Tools",
        "sku": "BSH-003",
        "price": 64.50,
        "stock": 18,
        "unit": "piece",
        "description": "7.5-amp motor, 12000 RPM, ergonomic grip",
    },
    "jigsaw": {
        "name": "Black+Decker Jigsaw",
        "category": "Power Tools",
        "sku": "BD-004",
        "price": 49.99,
        "stock": 10,
        "unit": "piece",
        "description": "5-amp, variable speed, 3000 SPM",
    },
    "rotary hammer": {
        "name": "Hilti TE 2-A22 Rotary Hammer",
        "category": "Power Tools",
        "sku": "HLT-005",
        "price": 249.00,
        "stock": 6,
        "unit": "piece",
        "description": "22V cordless, SDS-Plus, 3-mode operation",
    },

    # ── HAND TOOLS ────────────────────────────────────────────────────────────
    "hammer": {
        "name": "Stanley 20oz Claw Hammer",
        "category": "Hand Tools",
        "sku": "STN-010",
        "price": 18.99,
        "stock": 85,
        "unit": "piece",
        "description": "Steel head, fiberglass handle, anti-vibration",
    },
    "measuring tape": {
        "name": "Stanley 25ft Tape Measure",
        "category": "Hand Tools",
        "sku": "STN-011",
        "price": 12.50,
        "stock": 120,
        "unit": "piece",
        "description": "25ft/7.5m, blade lock, magnetic hook",
    },
    "wrench": {
        "name": "Craftsman Adjustable Wrench Set",
        "category": "Hand Tools",
        "sku": "CRF-012",
        "price": 34.99,
        "stock": 45,
        "unit": "set",
        "description": "3-piece set: 6\", 8\", 12\" adjustable wrenches",
    },
    "wire cutter": {
        "name": "Knipex Wire Cutter 7\"",
        "category": "Hand Tools",
        "sku": "KNP-013",
        "price": 22.99,
        "stock": 38,
        "unit": "piece",
        "description": "Chrome vanadium steel, cutting capacity 2.5mm",
    },
    "level": {
        "name": "Empire 48\" Magnetic Level",
        "category": "Hand Tools",
        "sku": "EMP-014",
        "price": 27.99,
        "stock": 30,
        "unit": "piece",
        "description": "3 vials, magnetic base, aluminum frame",
    },

    # ── FASTENERS ─────────────────────────────────────────────────────────────
    "wood screws": {
        "name": "Wood Screws #8 x 2\" (Box of 100)",
        "category": "Fasteners",
        "sku": "FST-020",
        "price": 7.99,
        "stock": 300,
        "unit": "box",
        "description": "Zinc-coated, Phillips head, hardened steel",
    },
    "anchor bolts": {
        "name": "Anchor Bolts M12 x 150mm (Pack of 10)",
        "category": "Fasteners",
        "sku": "FST-021",
        "price": 14.50,
        "stock": 200,
        "unit": "pack",
        "description": "Hot-dip galvanized, suitable for concrete",
    },
    "nail gun nails": {
        "name": "Framing Nails 3.1x90mm (1000-pack)",
        "category": "Fasteners",
        "sku": "FST-022",
        "price": 19.99,
        "stock": 150,
        "unit": "pack",
        "description": "Paper strip collated, 30-34 degree",
    },

    # ── CONCRETE & MASONRY ────────────────────────────────────────────────────
    "concrete mix": {
        "name": "Quikrete 80lb Concrete Mix",
        "category": "Concrete & Masonry",
        "sku": "CMX-030",
        "price": 8.49,
        "stock": 500,
        "unit": "bag",
        "description": "Pre-mixed, sets in 24-48 hours, compressive strength 4000 PSI",
    },
    "cement": {
        "name": "Portland Cement Type I/II 94lb",
        "category": "Concrete & Masonry",
        "sku": "CMX-031",
        "price": 14.99,
        "stock": 350,
        "unit": "bag",
        "description": "Gray portland cement, ASTM C150 compliant",
    },
    "tile adhesive": {
        "name": "Mapei Ceramic Tile Adhesive 25kg",
        "category": "Concrete & Masonry",
        "sku": "CMX-032",
        "price": 22.50,
        "stock": 180,
        "unit": "bag",
        "description": "White polymer-modified, interior/exterior use",
    },
    "grout": {
        "name": "Sanded Grout 10lb (Various Colors)",
        "category": "Concrete & Masonry",
        "sku": "CMX-033",
        "price": 11.99,
        "stock": 220,
        "unit": "bag",
        "description": "For joints 1/8\" – 1/2\", mold resistant",
    },

    # ── LUMBER ─────────────────────────────────────────────────────────────────
    "plywood": {
        "name": "3/4\" Plywood Sheet 4x8ft",
        "category": "Lumber",
        "sku": "LBR-040",
        "price": 52.99,
        "stock": 200,
        "unit": "sheet",
        "description": "CDX grade, exterior glue, 7-ply",
    },
    "steel rod": {
        "name": "Rebar Steel Rod #4 (1/2\") 20ft",
        "category": "Lumber & Steel",
        "sku": "LBR-041",
        "price": 16.75,
        "stock": 400,
        "unit": "piece",
        "description": "Grade 60, deformed bar, ASTM A615",
    },
    "2x4 lumber": {
        "name": "2x4x8ft Dimensional Lumber",
        "category": "Lumber",
        "sku": "LBR-042",
        "price": 6.49,
        "stock": 600,
        "unit": "piece",
        "description": "Kiln-dried, construction grade",
    },

    # ── PLUMBING ──────────────────────────────────────────────────────────────
    "pvc pipe": {
        "name": "PVC Pipe 1\" x 10ft",
        "category": "Plumbing",
        "sku": "PLM-050",
        "price": 9.99,
        "stock": 250,
        "unit": "piece",
        "description": "Schedule 40, NSF certified, pressure rated to 450 PSI",
    },
    "pipe fittings": {
        "name": "PVC Fittings Assortment (20-piece)",
        "category": "Plumbing",
        "sku": "PLM-051",
        "price": 18.99,
        "stock": 100,
        "unit": "set",
        "description": "Includes elbows, tees, couplings, 1\" size",
    },
    "ball valve": {
        "name": "Brass Ball Valve 3/4\"",
        "category": "Plumbing",
        "sku": "PLM-052",
        "price": 12.50,
        "stock": 75,
        "unit": "piece",
        "description": "Full port, 600 WOG, lever handle",
    },

    # ── ELECTRICAL ────────────────────────────────────────────────────────────
    "wire": {
        "name": "Romex 12/2 NM-B Wire 100ft",
        "category": "Electrical",
        "sku": "ELC-060",
        "price": 59.99,
        "stock": 80,
        "unit": "roll",
        "description": "12 AWG, 2-conductor with ground, 600V",
    },
    "conduit": {
        "name": "EMT Conduit 1/2\" x 10ft",
        "category": "Electrical",
        "sku": "ELC-061",
        "price": 8.99,
        "stock": 120,
        "unit": "piece",
        "description": "Electrical metallic tubing, galvanized steel",
    },
    "outlet box": {
        "name": "Electrical Outlet Box (Gang Box)",
        "category": "Electrical",
        "sku": "ELC-062",
        "price": 2.49,
        "stock": 400,
        "unit": "piece",
        "description": "Single gang, 1-gang PVC, nail-on style",
    },

    # ── SAFETY EQUIPMENT ──────────────────────────────────────────────────────
    "safety helmet": {
        "name": "MSA V-Gard Hard Hat",
        "category": "Safety Equipment",
        "sku": "SFT-070",
        "price": 24.99,
        "stock": 60,
        "unit": "piece",
        "description": "Class E, ANSI Z89.1, adjustable suspension",
    },
    "safety gloves": {
        "name": "Mechanix Wear Work Gloves",
        "category": "Safety Equipment",
        "sku": "SFT-071",
        "price": 16.99,
        "stock": 150,
        "unit": "pair",
        "description": "Synthetic leather, impact protection, M/L/XL",
    },
    "safety boots": {
        "name": "Timberland PRO Steel Toe Boots",
        "category": "Safety Equipment",
        "sku": "SFT-072",
        "price": 149.99,
        "stock": 30,
        "unit": "pair",
        "description": "Steel toe, waterproof, ASTM F2413",
    },
    "safety goggles": {
        "name": "3M Safety Goggles",
        "category": "Safety Equipment",
        "sku": "SFT-073",
        "price": 9.99,
        "stock": 90,
        "unit": "piece",
        "description": "Anti-fog, impact resistant, indirect vent",
    },

    # ── PAINT & COATINGS ──────────────────────────────────────────────────────
    "paint": {
        "name": "Sherwin-Williams Interior Latex Paint 1gal",
        "category": "Paint & Coatings",
        "sku": "PNT-080",
        "price": 38.99,
        "stock": 70,
        "unit": "gallon",
        "description": "Low VOC, washable, primer + paint in one",
    },
    "paint brush": {
        "name": "Purdy Angle Paint Brush 2.5\"",
        "category": "Paint & Coatings",
        "sku": "PNT-081",
        "price": 11.49,
        "stock": 100,
        "unit": "piece",
        "description": "Nylon/polyester blend, suitable for latex/oil",
    },
    "paint roller": {
        "name": "9\" Paint Roller Kit",
        "category": "Paint & Coatings",
        "sku": "PNT-082",
        "price": 14.99,
        "stock": 85,
        "unit": "kit",
        "description": "Includes frame, 2 covers (3/8\" nap), tray",
    },

    # ── LADDERS & SCAFFOLDING ─────────────────────────────────────────────────
    "ladder": {
        "name": "Werner 6ft Type I Fiberglass Ladder",
        "category": "Ladders & Scaffolding",
        "sku": "LDR-090",
        "price": 89.99,
        "stock": 20,
        "unit": "piece",
        "description": "250 lb rating, non-conductive, ANSI Type I",
    },
    "step ladder": {
        "name": "Louisville 8ft Aluminum Step Ladder",
        "category": "Ladders & Scaffolding",
        "sku": "LDR-091",
        "price": 64.99,
        "stock": 15,
        "unit": "piece",
        "description": "225 lb capacity, ANSI Type II, slip-resistant",
    },

    # ── ABRASIVES ─────────────────────────────────────────────────────────────
    "sandpaper": {
        "name": "3M Sandpaper Assortment (25-sheet)",
        "category": "Abrasives",
        "sku": "ABR-100",
        "price": 13.99,
        "stock": 200,
        "unit": "pack",
        "description": "60/80/120/150/220 grit mix, hook & loop",
    },
    "grinding disc": {
        "name": "Flap Disc 4.5\" 80-grit (10-pack)",
        "category": "Abrasives",
        "sku": "ABR-101",
        "price": 24.99,
        "stock": 110,
        "unit": "pack",
        "description": "Zirconia alumina, for metal grinding",
    },

    # ── ROOFING ───────────────────────────────────────────────────────────────
    "roofing nails": {
        "name": "Roofing Nails 1-3/4\" (5 lb Box)",
        "category": "Roofing",
        "sku": "RFG-110",
        "price": 12.99,
        "stock": 180,
        "unit": "box",
        "description": "Electro-galvanized, large head, smooth shank",
    },
    "roof shingles": {
        "name": "Architectural Shingles (1 square = 100 sq ft)",
        "category": "Roofing",
        "sku": "RFG-111",
        "price": 89.00,
        "stock": 100,
        "unit": "square",
        "description": "30-year warranty, fiberglass mat, Class A fire rating",
    },
    "roofing felt": {
        "name": "Felt Underlayment #15 (432 sq ft roll)",
        "category": "Roofing",
        "sku": "RFG-112",
        "price": 28.50,
        "stock": 75,
        "unit": "roll",
        "description": "Asphalt-saturated, water-resistant barrier",
    },
}

CATEGORIES = {
    "power tools": ["dewalt drill", "circular saw", "angle grinder", "jigsaw", "rotary hammer"],
    "hand tools": ["hammer", "measuring tape", "wrench", "wire cutter", "level"],
    "fasteners": ["wood screws", "anchor bolts", "nail gun nails"],
    "concrete & masonry": ["concrete mix", "cement", "tile adhesive", "grout"],
    "lumber": ["plywood", "steel rod", "2x4 lumber"],
    "plumbing": ["pvc pipe", "pipe fittings", "ball valve"],
    "electrical": ["wire", "conduit", "outlet box"],
    "safety equipment": ["safety helmet", "safety gloves", "safety boots", "safety goggles"],
    "paint & coatings": ["paint", "paint brush", "paint roller"],
    "ladders & scaffolding": ["ladder", "step ladder"],
    "abrasives": ["sandpaper", "grinding disc"],
    "roofing": ["roofing nails", "roof shingles", "roofing felt"],
}


# ─────────────────────────────────────────────
#  HELPER
# ─────────────────────────────────────────────

def find_product(name: str):
    """Fuzzy-match product name in inventory."""
    if not name:
        return None, None
    name_lower = name.lower().strip()
    # Exact match
    if name_lower in INVENTORY:
        return name_lower, INVENTORY[name_lower]
    # Partial match
    for key, val in INVENTORY.items():
        if name_lower in key or key in name_lower:
            return key, val
    # Fuzzy match
    matches = difflib.get_close_matches(name_lower, INVENTORY.keys(), n=1, cutoff=0.6)
    if matches:
        return matches[0], INVENTORY[matches[0]]
    return None, None


def stock_status(qty: int) -> str:
    if qty == 0:
        return "❌ Out of Stock"
    elif qty <= 10:
        return f"⚠️ Low Stock ({qty} left)"
    else:
        return f"✅ In Stock ({qty} units)"


# ─────────────────────────────────────────────
#  ACTIONS
# ─────────────────────────────────────────────

class ActionListCategories(Action):
    def name(self) -> Text:
        return "action_list_categories"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        cat_lines = "\n".join(f"  • {cat.title()}" for cat in CATEGORIES)
        msg = (
            f"🗂️ **BuildPro Product Categories** ({len(CATEGORIES)} categories, "
            f"{len(INVENTORY)} products)\n\n{cat_lines}\n\n"
            "Ask me about any category! E.g. *'Show me power tools'* or "
            "*'Do you have plumbing supplies?'*"
        )
        dispatcher.utter_message(text=msg)
        return []


class ActionListProductsByCategory(Action):
    def name(self) -> Text:
        return "action_list_products_by_category"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        category = tracker.get_slot("category")
        if not category:
            # Try to extract from latest message
            for ent in tracker.latest_message.get("entities", []):
                if ent.get("entity") == "category":
                    category = ent.get("value")
                    break

        if not category:
            dispatcher.utter_message(text="Which category are you interested in? "
                                          "Type 'show categories' to see all options.")
            return []

        cat_lower = category.lower().strip()
        # Find matching category
        matched_cat = None
        for key in CATEGORIES:
            if cat_lower in key or key in cat_lower:
                matched_cat = key
                break

        if not matched_cat:
            matches = difflib.get_close_matches(cat_lower, CATEGORIES.keys(), n=1, cutoff=0.5)
            matched_cat = matches[0] if matches else None

        if not matched_cat:
            dispatcher.utter_message(
                text=f"I couldn't find a category matching '{category}'. "
                     f"Try: {', '.join(CATEGORIES.keys())}"
            )
            return []

        products = CATEGORIES[matched_cat]
        lines = []
        for p_key in products:
            p = INVENTORY[p_key]
            status = stock_status(p["stock"])
            lines.append(f"  • **{p['name']}** — ${p['price']:.2f} | {status}")

        msg = (
            f"🗂️ **{matched_cat.title()}** — {len(products)} products:\n\n"
            + "\n".join(lines)
            + "\n\nAsk me for pricing or availability on any item!"
        )
        dispatcher.utter_message(text=msg)
        return [SlotSet("category", matched_cat)]


class ActionSearchProduct(Action):
    def name(self) -> Text:
        return "action_search_product"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        product = tracker.get_slot("product_name")
        if not product:
            for ent in tracker.latest_message.get("entities", []):
                if ent.get("entity") == "product_name":
                    product = ent.get("value")
                    break

        if not product:
            dispatcher.utter_message(text="What product are you looking for?")
            return []

        key, data = find_product(product)
        if not data:
            dispatcher.utter_message(
                text=f"🔍 No results for **'{product}'**.\n\n"
                     "Try a broader term (e.g., 'drill', 'pipe', 'cement') "
                     "or ask me to show all categories."
            )
            return []

        status = stock_status(data["stock"])
        msg = (
            f"🔍 **{data['name']}**\n"
            f"SKU: `{data['sku']}` | Category: {data['category']}\n\n"
            f"📝 {data['description']}\n\n"
            f"💰 Price: **${data['price']:.2f}** per {data['unit']}\n"
            f"📦 Availability: {status}"
        )
        dispatcher.utter_message(text=msg)
        return [SlotSet("product_name", key)]


class ActionCheckAvailability(Action):
    def name(self) -> Text:
        return "action_check_availability"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        product = tracker.get_slot("product_name")
        if not product:
            for ent in tracker.latest_message.get("entities", []):
                if ent.get("entity") == "product_name":
                    product = ent.get("value")
                    break

        if not product:
            dispatcher.utter_message(text="Which product would you like to check? "
                                          "Please specify a product name.")
            return []

        key, data = find_product(product)
        if not data:
            dispatcher.utter_message(
                text=f"I couldn't find **'{product}'** in our inventory. "
                     "Could you try a different name or browse our categories?"
            )
            return []

        status = stock_status(data["stock"])
        if data["stock"] == 0:
            msg = (
                f"❌ **{data['name']}** is currently **out of stock**.\n\n"
                "Would you like me to check for a similar product, "
                "or would you like to be notified when it's back?"
            )
        elif data["stock"] <= 10:
            msg = (
                f"⚠️ **{data['name']}** — {status}\n"
                f"Only {data['stock']} {data['unit']}(s) remaining! Order soon.\n"
                f"💰 Price: ${data['price']:.2f} per {data['unit']}"
            )
        else:
            msg = (
                f"✅ **{data['name']}** is available!\n"
                f"📦 Stock: {data['stock']} {data['unit']}(s) in inventory\n"
                f"💰 Price: ${data['price']:.2f} per {data['unit']}"
            )

        dispatcher.utter_message(text=msg)
        return [SlotSet("product_name", key)]


class ActionCheckPrice(Action):
    def name(self) -> Text:
        return "action_check_price"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        product = tracker.get_slot("product_name")
        if not product:
            for ent in tracker.latest_message.get("entities", []):
                if ent.get("entity") == "product_name":
                    product = ent.get("value")
                    break

        if not product:
            dispatcher.utter_message(text="Which product's price would you like to know?")
            return []

        key, data = find_product(product)
        if not data:
            dispatcher.utter_message(
                text=f"I couldn't find pricing for **'{product}'**. "
                     "Try checking our product catalog or browse by category."
            )
            return []

        msg = (
            f"💰 **Pricing for {data['name']}**\n\n"
            f"  Unit Price: **${data['price']:.2f}** per {data['unit']}\n"
            f"  SKU: `{data['sku']}`\n"
            f"  Category: {data['category']}\n\n"
            f"📦 Stock: {stock_status(data['stock'])}"
        )
        dispatcher.utter_message(text=msg)
        return [SlotSet("product_name", key)]


class ActionCheckStockLevel(Action):
    def name(self) -> Text:
        return "action_check_stock_level"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        product = tracker.get_slot("product_name")
        if not product:
            for ent in tracker.latest_message.get("entities", []):
                if ent.get("entity") == "product_name":
                    product = ent.get("value")
                    break

        if not product:
            dispatcher.utter_message(text="Which product's stock level do you want to check?")
            return []

        key, data = find_product(product)
        if not data:
            dispatcher.utter_message(
                text=f"I couldn't find **'{product}'** in our system. "
                     "Please verify the product name."
            )
            return []

        qty = data["stock"]
        status = stock_status(qty)

        if qty == 0:
            level_bar = "░░░░░░░░░░ 0%"
        elif qty <= 10:
            level_bar = "██░░░░░░░░ Low"
        elif qty <= 50:
            level_bar = "█████░░░░░ Medium"
        else:
            level_bar = "██████████ High"

        msg = (
            f"📊 **Stock Level: {data['name']}**\n\n"
            f"  {level_bar}\n"
            f"  Quantity: **{qty} {data['unit']}(s)**\n"
            f"  Status: {status}\n"
            f"  SKU: `{data['sku']}`"
        )
        dispatcher.utter_message(text=msg)
        return [SlotSet("product_name", key)]
