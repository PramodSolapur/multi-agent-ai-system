import { ChatGroq } from "@langchain/groq"
import {
    Annotation,
    END,
    MessagesAnnotation,
    StateGraph,
} from "@langchain/langgraph"
import { bookFlight, bookHotel } from "./tools.js"
import { ToolNode } from "@langchain/langgraph/prebuilt"

const hotelTools = [bookHotel]
const hotelToolNode = new ToolNode(hotelTools)

const flightTools = [bookFlight]
const flightToolNode = new ToolNode(flightTools)

const model = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0,
})

const customState = Annotation.Root({
    ...MessagesAnnotation.spec,
    nextRepresentative: Annotation({ type: "string" }),
})

const supervisor = async (state) => {
    const SYSTEM_PROMPT = `
    You are a frontline support agent for users who may ask about:
        Hotel bookings (book hotel, list hotels, reserve rooms)
        Flight bookings (book flights, airports, reservations)
        General / normal conversation
        Your role:
        If the user asks about hotel bookings, do not try to answer directly or collect booking details.  Instead, politely ask the user to hold for a moment and transfer them to the Hotel Bookings Team.
        If the user asks about flight bookings, do not try to answer directly or collect booking details. Instead, politely ask the user to hold for a moment and transfer them to the Flight Bookings Team.
        For all other/general questions, respond naturally and conversationally as a support agent.
    `

    const supportResponse = await model.invoke([
        {
            role: "system",
            content: SYSTEM_PROMPT,
        },
        ...state.messages,
    ])

    const CLASSIFICATION_SYSTEM_PROMPT = `
        You are an intelligent routing system for customer support. 
        Your task is to determine if a customer support representative is:
        - Transferring the user to the Hotel Bookings Team
        - Transferring the user to the Flight Bookings Team
        - Or simply responding conversationally without routing
        `

    const CLASSIFICATION_HUMAN_PROMPT = `
        The following conversation is between a customer support representative and a user. 
        Your job is to classify the representative's response.

        Decide whether the representative is:
        - Routing the user to the Hotel Bookings Team
        - Routing the user to the Flight Bookings Team
        - Or just responding in a conversational manner

        Respond ONLY with a JSON object containing a single key "nextRepresentative" 
        and one of the following values:
        - "HOTEL"  → if routing to hotel bookings
        - "FLIGHT" → if routing to flight bookings
        - "NORMAL" → if just replying conversationally
        `

    const categorizationResponse = await model.invoke(
        [
            {
                role: "system",
                content: CLASSIFICATION_SYSTEM_PROMPT,
            },
            ...state.messages,
            supportResponse,
            {
                role: "user",
                content: CLASSIFICATION_HUMAN_PROMPT,
            },
        ],
        {
            response_format: {
                type: "json_object",
            },
        }
    )

    const categorizationOutput = JSON.parse(categorizationResponse.content)

    return {
        messages: [supportResponse],
        nextRepresentative: categorizationOutput.nextRepresentative,
    }
}

const hotelSupport = async (state) => {
    const llm = model.bindTools(hotelTools)

    const SYSTEM_PROMPT = `
    You are part of the Hotel Booking Team.

    Rules:
    - If the user asks about booking a hotel, ALWAYS call the "book-hotel" tool directly. 
      Do not ask for additional information (dates, passengers, etc.).
    - If the user asks about searching hotels, use the appropriate tool if available.
    - If the user asks about flight bookings or anything unrelated to hotels, politely redirect 
      them to the correct team.
    - Do not make up information. If you cannot find the answer in context or tools, say 
      "I don't have enough information about it."
    `

    const hotelResponse = await llm.invoke([
        {
            role: "system",
            content: SYSTEM_PROMPT,
        },
        ...state.messages,
    ])

    return {
        messages: [hotelResponse],
    }
}

const flightSupport = async (state) => {
    const llm = model.bindTools(flightTools)

    const SYSTEM_PROMPT = `
    You are part of the Flight Booking Team.

    Rules:
    - If the user asks about booking a flight, ALWAYS call the "book-flight" tool directly. 
      Do not ask for additional information (dates, passengers, etc.).
    - If the user asks about searching flights, use the appropriate tool if available.
    - If the user asks about hotel bookings or anything unrelated to flights, politely redirect 
      them to the correct team.
    - Do not make up information. If you cannot find the answer in context or tools, say 
      "I don't have enough information about it."
    `

    const flightResponse = await llm.invoke([
        {
            role: "system",
            content: SYSTEM_PROMPT,
        },
        ...state.messages,
    ])

    return {
        messages: [flightResponse],
    }
}

const shouldContinue = async (state) => {
    const nextAgent = state.nextRepresentative
    if (nextAgent?.includes("HOTEL")) {
        return "hotelSupport"
    } else if (nextAgent?.includes("FLIGHT")) {
        return "flightSupport"
    } else if (nextAgent?.includes("NORMAL")) {
        return "__end__"
    } else {
        return "__end__"
    }
}

const shouldCallHotelTools = (state) => {
    const lastMessage = state.messages[state.messages.length - 1]

    if (lastMessage?.tool_calls?.length) {
        return "hotelTools"
    }

    return "__end__"
}

const shouldCallFlightTools = (state) => {
    const lastMessage = state.messages[state.messages.length - 1]

    if (lastMessage?.tool_calls?.length) {
        return "flightTools"
    }

    return "__end__"
}

const graph = new StateGraph(customState)
    .addNode("supervisor", supervisor)
    .addNode("hotelSupport", hotelSupport)
    .addNode("flightSupport", flightSupport)
    .addNode("hotelTools", hotelToolNode)
    .addNode("flightTools", flightToolNode)
    .addEdge("__start__", "supervisor")
    .addConditionalEdges("supervisor", shouldContinue, {
        hotelSupport: "hotelSupport",
        flightSupport: "flightSupport",
        __end__: END,
    })
    .addConditionalEdges("hotelSupport", shouldCallHotelTools, {
        hotelTools: "hotelTools",
        __end__: END,
    })
    .addConditionalEdges("flightSupport", shouldCallFlightTools, {
        flightTools: "flightTools",
        __end__: END,
    })

const app = graph.compile()

async function startConversation() {
    const stream = await app.stream({
        messages: [
            {
                role: "user",
                content:
                    "Hi, My name is X. can you book me a flight from bangalore to bali?",
            },
        ],
    })
    for await (const value of stream) {
        console.log(value)
    }
}

startConversation()
