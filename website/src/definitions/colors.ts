export const getCategoryColor = (cat: string) => {
    switch (cat) {
        case "Allgemein":
            return "#FF9E80";
        case "Hardware":
            return "#B388FF";
        case "Software":
            return "#82B1FF";
        case "Technologiefelder":
            return "#84FFFF";
        case "Kommunikation":
            return "#CCFF90";
        case "Wirtschaft und Arbeit":
            return "#FFFF8D";
        case "Politik und Regulierung":
            return "#FF80AB";
        case "House Stark":
            return "#82B1FF";
        case "House Lannister":
            return "#FFD180";
        case "House Baratheon":
            return "#FFFF8D";
        case "House Targaryen":
            return "#FF8A80";
        case "House Tyrell":
            return "#CCFF90";
        case "House Bolton":
            return "#A1887F";
        case "House Greyjoy":
            return "#A7FFEB";
        default:
            return "#BDBDBD";
    }
}