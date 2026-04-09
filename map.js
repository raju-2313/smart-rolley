function changeMap(section) {
    
    const mapImage = document.getElementById("storeMap");

    switch(section) {
        case "groceries":
            mapImage.src = "images/groceries.png";
            break;
 
        case "electronics":
            mapImage.src = "images/electronics.png";
            break;

        case "dairy" :
            mapImage.src = "images/dairy.png";
            break;

        case "clothing":
            mapImage.src = "images/clothing.png";
            break;

        default:
            mapImage.src = "images/store.png";
            break;

    }













}