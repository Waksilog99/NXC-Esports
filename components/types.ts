
export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    sponsorId: number | null;
    imageUrl: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface Sponsor {
    id: number;
    name: string;
    logoUrl: string;
    tier: string;
    websiteUrl: string | null;
}
