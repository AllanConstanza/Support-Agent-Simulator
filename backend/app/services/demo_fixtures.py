"""Canned content used when settings.demo_mode is True.

Nothing in this file ever calls the Anthropic API — it exists so a publicly
deployed demo can be fully interactive with zero risk of real API spend,
regardless of how much traffic it gets.
"""

DEMO_PERSONAS: list[dict] = [
    {
        "caller_name": "Marcus Webb",
        "category": "Network",
        "subcategory": "VPN",
        "short_description": "VPN drops every few minutes during video calls",
        "description": (
            "User reports the VPN client disconnects repeatedly during client-facing video "
            "calls, starting this morning. Reconnecting works but only holds for a few minutes."
        ),
        "true_priority": 2,
        "suggested_impact": 2,
        "suggested_urgency": 1,
        "opening_message": (
            "hi, my vpn keeps dropping every few minutes and I'm on back to back client calls "
            "today. this is really bad timing, can someone look at this now?"
        ),
    },
    {
        "caller_name": "Priya Anand",
        "category": "Hardware",
        "subcategory": "Printer",
        "short_description": "Office printer on 3rd floor won't accept print jobs",
        "description": (
            "User states the shared 3rd floor printer shows as offline in their print dialog. "
            "No urgent deadline mentioned; a workaround printer is available on another floor."
        ),
        "true_priority": 4,
        "suggested_impact": 3,
        "suggested_urgency": 3,
        "opening_message": (
            "Hello! Not urgent, but the printer by the kitchen on 3 keeps showing offline. "
            "Whenever someone gets a chance could you take a look? Thanks so much."
        ),
    },
    {
        "caller_name": "Devon Okafor",
        "category": "Software",
        "subcategory": "Email Client",
        "short_description": "Outlook won't sync new emails since this morning",
        "description": (
            "User's Outlook desktop client stopped receiving new mail around 9am; webmail works "
            "fine. User is unsure whether this is a settings issue or something on IT's end."
        ),
        "true_priority": 3,
        "suggested_impact": 2,
        "suggested_urgency": 2,
        "opening_message": (
            "hey so my outlook stopped getting new emails today?? webmail seems ok though. "
            "not sure if its just me or if something broke, sorry if this is a dumb question"
        ),
    },
    {
        "caller_name": "Rachel Kim",
        "category": "Access Management",
        "subcategory": "Account Lockout",
        "short_description": "Locked out of account after password expiration",
        "description": (
            "User's domain account locked after a password expiration prompt they dismissed "
            "accidentally. They have a payroll deadline in the next hour and need access restored."
        ),
        "true_priority": 1,
        "suggested_impact": 1,
        "suggested_urgency": 1,
        "opening_message": (
            "I just got locked out of my account and I need to submit payroll in less than an "
            "hour!! I clicked something wrong on a password popup. Please help ASAP this is urgent."
        ),
    },
    {
        "caller_name": "Tom Ricci",
        "category": "Database",
        "subcategory": "Performance",
        "short_description": "Reporting dashboard queries timing out for whole team",
        "description": (
            "User reports the shared analytics dashboard has been timing out for their entire "
            "team since yesterday afternoon, blocking end-of-quarter reporting for several teams."
        ),
        "true_priority": 1,
        "suggested_impact": 1,
        "suggested_urgency": 1,
        "opening_message": (
            "Our whole team's dashboard has been timing out since yesterday and we have "
            "quarter-end reports due tomorrow morning. Is this a known issue? We're pretty stuck."
        ),
    },
    {
        "caller_name": "Lena Brandt",
        "category": "Software",
        "subcategory": "Business Application",
        "short_description": "Expense report tool shows a blank screen after login",
        "description": (
            "User can log into the expense reporting tool but the page renders blank afterward. "
            "Tried refreshing once already. Not blocking any immediate deadline."
        ),
        "true_priority": 3,
        "suggested_impact": 2,
        "suggested_urgency": 2,
        "opening_message": (
            "Hi there, sorry to bother you — the expense tool just shows a blank white page "
            "after I log in. I tried refreshing but no luck. No rush, whenever you have time."
        ),
    },
]

# Cycled by how many prior client_ai messages exist on the incident, regardless
# of persona — keeps the "conversation" feeling responsive without needing NLU.
DEMO_REPLIES: list[str] = [
    "Okay, let me try that now, one sec.",
    "Alright I did that — still seeing the same issue on my end though.",
    "Hmm, that helped a little but it's not fully fixed.",
    "Oh wait, I think that actually worked! Let me double check.",
    "Yes! That fixed it. Thank you so much for the help.",
]

DEMO_FEEDBACK_NOTES: list[str] = [
    (
        "Good, steady pace through the conversation and clear questions. Consider "
        "acknowledging the customer's urgency earlier before diving into troubleshooting steps."
    ),
    (
        "Solid troubleshooting sequence. To sharpen this further, restate what you're checking "
        "before each step so the customer knows what's happening and doesn't feel left waiting."
    ),
    (
        "Nice job keeping the tone calm and professional. Double-check impact/urgency against "
        "the business context described (deadlines, number of people affected) before setting priority."
    ),
    (
        "You moved through this efficiently. One area to grow: a brief empathy statement up "
        "front tends to lower a frustrated customer's tension before troubleshooting begins."
    ),
]
