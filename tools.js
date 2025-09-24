import { tool } from "@langchain/core/tools"

export const bookHotel = tool(
    async function () {
        return JSON.stringify({
            message: "Hotel booking is successful",
            hotelName: "Grand Bali Resort",
            hotelId: "H12345",
            checkInDate: "2025-09-26",
            checkOutDate: "2025-09-30",
            rooms: 2,
            adults: 4,
            children: 3,
            totalPrice: 3000,
            currency: "USD",
            roomType: "Deluxe Suite",
        })
    },
    {
        name: "book-hotel",
        description: "Call this tool to book a hotel",
    }
)

export const bookFlight = tool(
    async function () {
        return JSON.stringify({
            message: "Flight booking is successful",
            from: "Bangalore",
            to: "Bali",
            departureDate: "2025-09-26",
            returnDate: "2025-09-27",
            adults: 4,
            children: 3,
            infants: 0,
            totalPrice: 3000,
            currency: "USD",
        })
    },
    {
        name: "book-flight",
        description: "Call this tool to book a flight",
    }
)
