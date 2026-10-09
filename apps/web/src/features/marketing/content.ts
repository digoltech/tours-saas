export type MarketingPage = {
  slug: string;
  title: string;
  description: string;
  heading: string;
  definition: string;
  audience: string;
  sections: { heading: string; paragraphs: string[] }[];
  table: { caption: string; headings: string[]; rows: string[][] };
  checklist: string[];
  limits: string;
  faqs: { question: string; answer: string }[];
  related: { href: string; label: string }[];
};

export const featurePages: MarketingPage[] = [
  {
    slug: "bus-booking-software",
    title: "Bus Booking Software for Travel Agencies",
    description: "Manage trip search, seat holds, passenger details, PNR lookup and manual payment records with Digol TravelOS bus booking software.",
    heading: "Bus booking software for your branch teams",
    definition: "Bus booking software connects a scheduled trip, a selected seat, passenger details and a payment record. Digol TravelOS gives agency teams a guided booking workspace and a searchable ticket history, with access scoped to the branch doing the work.",
    audience: "For agencies and bus operators that sell scheduled trips through their own staff and need a consistent process at every booking desk.",
    sections: [
      { heading: "Move from departure to passenger in one workflow", paragraphs: ["Start with the trip search, then compare the available timings and buses. Pick the relevant departure before opening its seat map. Seat holds give the booking process an intermediate state while staff collect the passenger information needed to finish the ticket.", "The booking workspace separates trip selection, bus and timing selection, seats, passenger information and payment entry. Passenger name, age, gender and phone number are required. Review these details with the traveller before confirming, rather than trying to repair an incomplete ticket at boarding."] },
      { heading: "Find the ticket when a customer calls", paragraphs: ["A booking reference is useful only if staff can retrieve it. Ticket search supports PNR, customer email and phone number, so a caller does not have to remember the exact departure or the employee who created the booking.", "Branch employees can work with operational records belonging to their branch, including colleagues’ bookings. The original booking attribution remains attached to the record, so shared access does not erase who made the sale or its commission history."] },
    ],
    table: { caption: "What staff do at each booking step", headings: ["Step", "Staff action", "What to verify"], rows: [ ["Trip", "Search the planned journey", "Travel date and route"], ["Bus and timing", "Choose an available departure", "Bus, time and boarding details"], ["Seats", "Select seats and create a hold", "Seat choice and current availability"], ["Passengers", "Enter required passenger details", "Name, age, gender and phone"], ["Payment", "Record the payment details", "Amount and selected payment method"] ] },
    checklist: ["Set up routes, buses and trips before selling seats.", "Use the seat map to verify availability for the selected departure.", "Review the passenger contact number before confirming.", "Use ticket history for follow-up, cancellation and financial reconciliation."],
    limits: "Payment entry records money handled by your team. It is not an online payment gateway or a promise that money has been captured. Staff should verify the actual receipt of funds before marking the corresponding payment. Refunds and settlements also require your team’s operational review.",
    faqs: [
      { question: "Can I search a bus ticket without its PNR?", answer: "Yes. Staff can search ticket history using the customer email or phone number, in addition to the PNR. Results remain limited by the user’s agency and branch access." },
      { question: "Does Digol TravelOS collect online payments?", answer: "The current booking workflow supports manual payment recording. It does not provide an integrated online payment gateway. Record a payment only after verifying it through your actual collection process." },
      { question: "Can another employee handle an existing booking?", answer: "Standard employees can access operational bookings in their assigned branch, including colleagues’ bookings. Booking attribution and commission history remain attached to the original records." },
    ],
    related: [{ href: "/guides/bus-booking-workflow", label: "Read the booking workflow guide" }, { href: "/features/travel-agency-management-software", label: "Explore agency and branch management" }, { href: "/features/bus-fleet-management-software", label: "Prepare your fleet for booking" }],
  },
  {
    slug: "travel-agency-management-software",
    title: "Travel Agency Management Software for Multiple Branches",
    description: "Bring branch teams, bookings, routes, fleet and finance records together with Digol TravelOS travel agency management software.",
    heading: "Travel agency management software for connected branches",
    definition: "Travel agency management software gives an agency a shared system for its people, branches, trips, bookings and financial records. Digol TravelOS uses an agency owner, branch admin and employee model so teams can work locally while the owner maintains an agency-wide view.",
    audience: "For a travel agency growing from one booking desk into several branches, with a need to keep responsibilities and operational records clear.",
    sections: [
      { heading: "Start with a main branch and grow deliberately", paragraphs: ["Registration creates an agency owner and a main branch. The owner’s branch assignment provides a default place to operate; it does not reduce the owner’s access to the agency. Additional branches can be created before a branch admin is appointed, allowing the agency to prepare the branch and assign leadership later.", "Only the owner appoints, replaces or transfers branch admins. Branch admins can add, invite, edit and deactivate employees within their own branch. Every new standard branch admin or employee needs an active branch in the same agency."] },
      { heading: "Keep operational and financial context together", paragraphs: ["Bookings, customers, fleet and trips use the team’s access scope. Shared agency routes and stops remain readable by branch teams, while owners manage these shared definitions. This keeps a common route network without giving every employee agency-wide editing rights.", "Finance workspaces support booking-linked payment records, GST information, commissions, refunds and manual settlement records. Branch teams use their permitted operational view; owners can compare branches and review agency reporting. These records support reconciliation rather than replace the team’s checks of actual money received or paid."] },
    ],
    table: { caption: "Who is responsible for each level", headings: ["Role", "Team responsibility", "Operational scope"], rows: [["Agency owner", "Appoint admins and manage agency settings", "All agency branches"], ["Branch admin", "Manage employees assigned to the branch", "Their assigned branch"], ["Employee", "Handle bookings and daily operations", "Their assigned branch"], ["Platform Super Admin", "Separate platform administration", "Separate from the agency team hierarchy"]] },
    checklist: ["Confirm the main branch details after registering.", "Assign staff to the branch where they operate.", "Appoint a branch admin when the new branch is ready.", "Review reports with a branch filter before comparing results.", "Use owner-only advanced access settings for custom permissions."],
    limits: "Bulk data, billing and agency settings remain owner responsibilities. Existing custom roles and their assignments are preserved; their permissions should be reviewed separately from the three standard roles. The software does not automatically move money between branches or external accounts.",
    faqs: [
      { question: "Does an agency owner also need a branch admin role?", answer: "No. The owner’s broader agency permissions cover running the main branch. The owner remains agency-scoped even when assigned to a default operational branch." },
      { question: "Can a branch admin create another branch admin?", answer: "No. Only the agency owner appoints, replaces or transfers branch admins. A branch admin manages employees within their assigned branch." },
      { question: "Are custom roles supported?", answer: "Owners can manage custom roles and permissions in Advanced access settings. Standard roles provide a clear starting hierarchy, while existing custom roles and assignments are preserved." },
    ],
    related: [{ href: "/guides/branch-team-permissions", label: "Understand branch team permissions" }, { href: "/features/bus-booking-software", label: "See the booking workspace" }, { href: "/features/bus-fleet-management-software", label: "Connect fleet and trip planning" }],
  },
  {
    slug: "bus-fleet-management-software",
    title: "Bus Fleet Management Software for Trip Operations",
    description: "Organize bus records, seat layouts, operators, drivers and scheduled trips with Digol TravelOS fleet management software.",
    heading: "Bus fleet management software for trip planning",
    definition: "Bus fleet management software organizes the vehicles and people used to run departures. Digol TravelOS connects bus records, seat layouts, operators and drivers with scheduled trips so booking staff can sell seats against the right vehicle information.",
    audience: "For agencies and operators that need their fleet records and booking workspace to agree on the bus assigned to a departure.",
    sections: [
      { heading: "Make the bus record useful to the booking desk", paragraphs: ["A bus record brings vehicle information and its seat layout into a dedicated page. The seat-layout builder supports configuring the seating arrangement so a trip can use a map that staff recognize. Review the layout against the actual vehicle before it is used for sales.", "Keep bus information current when the operational plan changes. Staff choosing a departure should be able to identify the bus and its available seats without consulting a separate spreadsheet for each step. Vehicle and trip records remain subject to the user’s branch and agency permissions."] },
      { heading: "Connect operators, drivers, routes and departures", paragraphs: ["Operator pages show their related buses, making it easier to review the vehicles associated with an operator. Dedicated bus, driver, route and trip pages give staff a place to inspect details and make permitted edits rather than relying on a crowded list view.", "Routes and stops form shared agency definitions. Branch teams can read them for operational work, while the owner controls their changes. A planned trip then ties together a route, departure timing and vehicle context for the booking flow."] },
    ],
    table: { caption: "Records to review before opening a departure for booking", headings: ["Record", "Purpose", "Operational check"], rows: [["Bus", "Identify the vehicle", "Vehicle details are current"], ["Seat layout", "Show seats in the booking workspace", "Map matches the actual bus"], ["Operator", "Group related buses", "Correct operator association"], ["Driver", "Maintain driver information", "Assigned details are correct"], ["Route and stops", "Define the journey", "Boarding and destination are correct"], ["Trip", "Prepare a specific departure", "Timing, vehicle and fare details agree"]] },
    checklist: ["Check the seat map against the vehicle before sales begin.", "Review operator and bus associations when adding vehicles.", "Keep route definitions consistent across branches.", "Check each scheduled departure before the booking team uses it."],
    limits: "The current fleet workspace manages operational records and seat layouts. It does not claim GPS vehicle tracking, live telematics or automated maintenance scheduling. Confirm vehicle readiness through your own operational process before assigning it to a departure.",
    faqs: [
      { question: "Does the fleet software provide live GPS tracking?", answer: "No. The current Digol TravelOS fleet workspace organizes vehicle, operator, driver, seat-layout and trip records. Live GPS or telematics tracking is not part of the functionality described here." },
      { question: "Can I create a seat layout for a bus?", answer: "Yes. The seat-layout builder supports configuring a bus seating arrangement. Review the saved map against the physical vehicle before using it for booking." },
      { question: "Can branches edit shared agency routes?", answer: "Branch teams can read shared routes and stops for operational work. Agency owners manage the shared definitions so changes stay under agency control." },
    ],
    related: [{ href: "/features/bus-booking-software", label: "Connect fleet records to bookings" }, { href: "/features/travel-agency-management-software", label: "Review agency operations" }, { href: "/guides/bus-booking-workflow", label: "Check the end-to-end booking process" }],
  },
];

export const guidePages: MarketingPage[] = [
  {
    slug: "bus-booking-workflow",
    title: "Bus Booking Workflow: From Trip Search to Payment Record",
    description: "A practical guide for booking staff: select a trip, check the bus, hold seats, verify passenger details and record payment in Digol TravelOS.",
    heading: "How to run a bus booking workflow",
    definition: "A reliable bus booking workflow checks the journey first, seats second, passenger details third and the actual payment before confirming its record. This product-authored guide explains the five stages supported by Digol TravelOS and the checks staff should make at each stage.",
    audience: "For booking employees and branch admins preparing a consistent process for counter bookings and customer enquiries.",
    sections: [
      { heading: "1. Confirm the journey before selecting seats", paragraphs: ["Ask for the travel date, origin, destination and preferred departure time. Search the planned trip, then compare the available buses and timings. Confirm the chosen departure with the customer before opening the seat map: a good seat on the wrong date still creates a booking problem.", "Review boarding information and bus details as part of the selection. If the trip is not available, resolve the operational plan rather than trying to create a ticket against a different departure as a placeholder."] },
      { heading: "2. Hold seats and review every passenger", paragraphs: ["Select the required seats for the chosen bus and departure. A hold is an intermediate step, not a substitute for a completed ticket. If staff are interrupted, return to the current trip state and check availability before continuing.", "Enter the required name, age, gender and phone number for passengers. Read names and the contact number back to the customer. Accurate contact details also help when the customer later asks staff to locate a ticket without remembering its PNR."] },
      { heading: "3. Verify receipt, record payment and retain the reference", paragraphs: ["The payment step records a payment handled by the team. Verify the funds using the actual collection method before entering the payment record. Selecting a payment method in the software does not itself charge a card, collect money online or complete a bank transfer.", "After confirming the booking, retain its PNR and review the ticket details with the customer. Use PNR, email or phone search for later questions. For cancellations or refunds, inspect the existing booking and financial history before recording a change so the record retains a clear trail."] },
    ],
    table: { caption: "A booking desk checklist", headings: ["Stage", "Question to ask", "Record to review"], rows: [["Journey", "Is this the right date and route?", "Selected trip"], ["Departure", "Is this the right bus and time?", "Departure details"], ["Seat", "Are these the requested seats?", "Current seat map"], ["Passenger", "Are required details complete?", "Name, age, gender and phone"], ["Payment", "Have the funds actually been received?", "Amount and payment record"], ["Follow-up", "Can staff retrieve the booking?", "PNR, email or phone search"]] },
    checklist: ["Keep a consistent order: journey, departure, seats, passengers, payment.", "Treat a held seat as a work in progress.", "Verify funds independently of the payment form.", "Review existing booking history before a cancellation or refund."],
    limits: "This guide covers the current staff booking workflow. Your own refund rules, boarding practices and payment collection process still need to be communicated to customers. Required data and operational checks do not guarantee that a passenger supplied correct information.",
    faqs: [{ question: "Which passenger fields are required?", answer: "The booking workflow requires passenger name, age, gender and phone number. Staff should review these details with the customer before confirming the booking." }, { question: "Is a seat hold a confirmed booking?", answer: "No. A seat hold is an intermediate booking state while the team completes the required steps. Check the current trip state if the booking process is interrupted." }, { question: "What should staff do when a customer has lost the PNR?", answer: "Use the customer email or phone number to search ticket history. Verify the selected booking and passenger details before taking further action." }],
    related: [{ href: "/features/bus-booking-software", label: "Explore bus booking software" }, { href: "/guides/branch-team-permissions", label: "Review who can access a booking" }, { href: "/features/bus-fleet-management-software", label: "Prepare fleet and seat layouts" }],
  },
  {
    slug: "branch-team-permissions",
    title: "Agency Owner, Branch Admin and Employee Permissions Guide",
    description: "Understand who manages branches, staff and bookings in Digol TravelOS, including owner-only actions and branch-scoped employee access.",
    heading: "How agency and branch team permissions work",
    definition: "Digol TravelOS uses three standard agency roles: Agency owner, Branch admin and Employee. The owner manages the agency; branch admins manage their branch employees; employees handle branch operations. Platform Super Admin is a separate role, not another name for an agency owner.",
    audience: "A product-authored reference for agency owners assigning responsibilities and branch admins onboarding employees.",
    sections: [
      { heading: "Keep agency authority with the owner", paragraphs: ["The agency owner can work across all branches and manages agency settings, billing, bulk data and advanced permissions. Registration assigns the owner to a main branch so everyday work has a default branch. The assignment does not make the owner branch-scoped or require an extra Branch admin role.", "Only the owner can appoint, replace or transfer branch admins. A branch can be created without an admin, then assigned one later. Owners should review the branch assignment when inviting or adding a new standard member: it must be an active branch in the same agency."] },
      { heading: "Give branch teams enough access for daily work", paragraphs: ["Branch admins add, invite, edit and deactivate employees in their own branch. They cannot appoint other branch admins or transfer employees into another branch. Their employee forms use their assigned branch, avoiding an accidental selection of a branch they do not manage.", "Employees can work with bookings, customers, finance, trips and fleet within their assigned branch. That includes colleagues’ operational bookings in the branch, while booking attribution and financial history remain intact. Employees cannot manage staff, create branches, change roles or edit agency settings."] },
      { heading: "Review custom access separately", paragraphs: ["Owners can use Advanced access settings for custom roles and permissions. Existing custom roles and assignments are preserved. A custom role should be reviewed according to its actual permissions rather than treated as identical to a standard Employee or Branch admin role.", "When access changes, affected sessions are revoked so the user receives current permissions on the next sign-in. Staff changes should also preserve operational history; assigning a new administrator does not require rewriting past bookings, commissions or payment records."] },
    ],
    table: { caption: "Standard role permissions at a glance", headings: ["Action", "Agency owner", "Branch admin", "Employee"], rows: [["Work with branch bookings", "All agency branches", "Own branch", "Own branch"], ["Add and manage employees", "All agency branches", "Own branch", "No"], ["Appoint branch admins", "Yes", "No", "No"], ["Create branches", "Yes", "No", "No"], ["Read shared routes and stops", "Yes", "Yes", "Yes"], ["Edit shared routes and stops", "Yes", "No", "No"], ["Agency settings, billing and bulk data", "Yes", "No", "No"]] },
    checklist: ["Use the standard role matching the member’s responsibility.", "Confirm an active same-agency branch for each new branch member.", "Have the owner approve appointments and transfers of branch admins.", "Review actual permissions before assigning a custom role.", "Ask users to sign in again after an access change."],
    limits: "The table describes standard roles. Custom roles depend on their assigned permissions and are not automatically reassigned during standard-role updates. Agency and branch boundaries still apply; this hierarchy does not grant access to other agencies.",
    faqs: [{ question: "Can employees see bookings created by their colleagues?", answer: "Yes, standard employees have branch-wide operational access. They can work with colleagues’ bookings in their assigned branch, while other branches and agencies remain outside their access." }, { question: "Who can transfer a branch admin?", answer: "Only the agency owner can appoint, replace or transfer branch admins. Branch admins manage employees within their assigned branch." }, { question: "Can branch employees read the agency’s routes?", answer: "Yes. Shared agency routes and stops remain readable by branch teams. Owners manage those shared definitions." }],
    related: [{ href: "/features/travel-agency-management-software", label: "Explore travel agency management" }, { href: "/features/bus-booking-software", label: "Review branch booking operations" }, { href: "/guides/bus-booking-workflow", label: "Train staff on the booking workflow" }],
  },
];
