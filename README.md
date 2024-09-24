
# Bridgestars Parse Server
This is a JS + Parse backend for Bridgestars Unity.

It provides features related to educational contract bridge.

#### tl;dr;
A school or organisation can create a room and vouchers/codes and give to its members, letting them join a room on Bridgestars.

In the room they can then chat in the closed forum or publish courses and problems related to bidding or play. They can also play each other or bots in matches. (`.NET` realtime server is needed for full features)



## Features

- **User Management**: Full user-related functionality is available in `user.ts`, including user creation, management, and authentication.
  
- **Voucher System**: A voucher and discount system is implemented, enabling the creation and application of vouchers, located in `voucher.ts`.
  
- **Stripe Integration**: 
  - **Subscriptions**: Manage recurring subscription-based payments via Stripe in `subscription.ts`.
  - **Customer Management**: Stripe customer creation and management in `customer.ts`.
  - **Payment Links**: Integration for Stripe payment links in `paymentLink.ts`.
  - **Webhooks**: Stripe webhooks processing to handle events like successful payments in `webhook.ts`.
  
- **Chat Management**: 
  - `chat.ts` handles messaging and interactions within these chat rooms.

- **Courses and course rooms**: 
  - `room.ts` manages the creation and maintenance of course rooms.
  - `courses.ts` handles courses in bidding, play etc.

- **Post and Comment System**: Functionality for creating and managing posts and comments (`post.ts`, `comment.ts`).

- **Role Management**: Admin and user role management is supported in `role.ts`.

- **Match Management**: Contains structure for tables and match handling, with related logic in `course.ts` and `match.ts`.

## File Structure

- `functions/`: Contains various function modules.
  - `stripe/`: Handles Stripe-related functionality.
  
- `classes/`: Contains TypeScript classes to handle data structures and logic (e.g., `user.ts`, `room.ts`, `invoice.ts`).
