const products = [
    {
        barcode:"1001",
        name: "Milk 1L",
        price: 50,
        suggestions: ["1002"]
    },

    {
        barcode:"1002",
        name: "Bread",
        price: 30,
        suggestions: ["1003"]
    },

    {
        barcode:"1003",
        name: "Butter",
        price: 40,
        suggestions: []
    },

    {
        barcode:"1004",
        name: "Pasta",
        price: 60,
        suggestions: ["1005"]
    },

    {
        barcode:"1005",
        name: "Sauce",
        price: 45,
        suggestions: []
    },

{
        barcode: "1006",
        name: "Eggs (6 pcs)",
        price: 45,
        suggestions: ["1001", "1002"] // Suggests Milk or Bread
    },

    {
        barcode: "1007",
        name: "Coffee Powder",
        price: 120,
        suggestions: ["1001", "1008"] // Suggests Milk or Sugar
    },

    {
        barcode: "1008",
        name: "Sugar 1kg",
        price: 45,
        suggestions: [] 
    },

    {
        barcode: "1009",
        name: "Potato Chips",
        price: 20,
        suggestions: ["1010"] // Suggests a Drink
    },

    {
        barcode: "1010",
        name: "Cold Drink 500ml",
        price: 40,
        suggestions: ["1009"] // Suggests Chips
    }

    
];