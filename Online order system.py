class MenuItem:
    def __init__(self, name, price):
        self.name = name
        self.price = price

class Menu:
    def __init__(self):
        self.items = []
        self.add_default_items()

    def add_default_items(self):
        self.add_item(MenuItem("Pizza", 5))
        self.add_item(MenuItem("Drink", 2))
        self.add_item(MenuItem("Hamburger", 3))

    def add_item(self, item):
        self.items.append(item)

    def remove_item(self, item_name):
        for item in self.items:
            if item.name == item_name:
                self.items.remove(item)
                return True
        print(f"Item '{item_name}' not found in the menu.")
        return False

class User:
    def __init__(self, username, role):
        self.username = username
        self.role = role

class Admin(User):
    def __init__(self, username, password):
        super().__init__(username, "Admin")
        self.password = password

    def display_menu(self, menu):
        print("\nMenu")
        for item in menu.items:
            print(f"{item.name}: ${item.price}")

    def update_menu(self, menu, item_name, new_price):
        for item in menu.items:
            if item.name == item_name:
                item.price = new_price
                print(f"Price of {item_name} updated to ${new_price}")
                return
        print(f"Item '{item_name}' not found in the menu.")

    def add_menu(self, menu, item_name, item_price):
        menu.add_item(MenuItem(item_name, item_price))
        print(f"{item_name} added to the menu.")

    def display_feedbacks(self, feedbacks):
        print("\nFeedbacks")
        for feedback in feedbacks:
            print(feedback)

class Customer(User):
    def __init__(self, username):
        super().__init__(username, "Customer")

    def display_menu(self, menu):
        print("\nMenu")
        for item in menu.items:
            print(f"{item.name}: ${item.price}")

    def place_order(self, menu):
        print("\nPlacing Order")
        order = {}
        total_cost = 0  # Initialize total cost to 0
        while True:
            item_name = input("Enter item name to order (or type 'done' to finish): ")
            if item_name.lower() == 'done':
                break
            for item in menu.items:
                if item.name == item_name:
                    if item_name in order:
                        order[item_name] += 1
                    else:
                        order[item_name] = 1
                    total_cost += item.price  # Add the price of the item to the total cost
                    print(f"{item_name} added to your order.")
                    break
            else:
                print(f"Item '{item_name}' not found in the menu.")
        print(f"Total cost of your order: ${total_cost}")  # Display the total cost
        return order

    def leave_feedback(self, feedbacks):
        feedback = input("\nEnter your feedback: ")
        feedbacks.append(feedback)
        print("Thank you for your feedback!")

class Delivery(User):
    def __init__(self, username, password):
        super().__init__(username, "Delivery")
        self.password = password

    def receive_order(self, order):
        print("Received new order:")
        for item, quantity in order.items():
            print(f"{item}: {quantity}")
        print("Ready for delivery.")

    def mark_delivered(self):
        confirmation = input("Was the order successfully delivered? (yes/no): ")
        return confirmation.lower() == 'yes'

class Restaurant:
    def __init__(self):
        self.menu = Menu()
        self.feedback = []
        self.orders = {}

    def handle_customer(self):
        username = input("Enter your name: ")
        customer = Customer(username)
        while True:
            print("\nCustomer Menu")
            print("1. View Menu")
            print("2. Place Order")
            print("3. Confirm Order")
            print("4. Leave Feedback")
            print("5. Exit")

            choice = input("Enter your choice: ")

            if choice == '1':
                customer.display_menu(self.menu)
            elif choice == '2':
                order = customer.place_order(self.menu)
                if order:
                    self.orders[username] = order
            elif choice == '3':
                if username in self.orders:
                    print("Your Current Order:")
                    for item, quantity in self.orders[username].items():
                        print(f"{item}: {quantity}")
                else:
                    print("No order placed yet.")
            elif choice == '4':
                customer.leave_feedback(self.feedback)
            elif choice == '5':
                break
            else:
                print("Invalid choice. Please try again.")

    def handle_admin(self):
        admin_username = "admin"
        admin_password = "admin123"  # Set your admin password here
        username = input("Enter admin username: ")
        password = input("Enter admin password: ")
        if username == admin_username and password == admin_password:
            admin = Admin(username, password)
            while True:
                print("\nAdmin Menu")
                print("1. View Menu")
                print("2. Change Menu")
                print("3. View Feedbacks")
                print("4. Exit")

                choice = input("Enter your choice: ")

                if choice == '1':
                    admin.display_menu(self.menu)
                elif choice == '2':
                    self.change_menu(admin)
                elif choice == '3':
                    admin.display_feedbacks(self.feedback)
                elif choice == '4':
                    break
                else:
                    print("Invalid choice. Please try again.")
        else:
            print("Invalid username or password.")

    def handle_delivery(self):
        delivery_username = input("Enter delivery username: ")
        delivery_password = input("Enter delivery password: ")
        if delivery_username == "delivery" and delivery_password == "delivery123":
            delivery_user = Delivery(delivery_username, delivery_password)
            while True:
                print("\nDelivery Menu")
                print("1. View Orders")
                print("2. Mark Order Delivered")
                print("3. Exit")

                choice = input("Enter your choice: ")

                if choice == '1':
                    self.view_orders()
                elif choice == '2':
                    self.mark_order_delivered(delivery_user)
                elif choice == '3':
                    break
                else:
                    print("Invalid choice. Please try again.")
        else:
            print("Invalid username or password.")

    def view_orders(self):
        if self.orders:
            print("\nCurrent Orders:")
            for username, order in self.orders.items():
                print(f"Customer: {username}")
                for item, quantity in order.items():
                    print(f"{item}: {quantity}")
                print()
        else:
            print("No orders at the moment.")

    def mark_order_delivered(self, delivery_user):
        if self.orders:
            customer_username = input("Enter customer's username: ")
            if customer_username in self.orders:
                if delivery_user.mark_delivered():
                    print("Order marked as delivered.")
                    del self.orders[customer_username]
                else:
                    print("Delivery not confirmed.")
            else:
                print("No order found for the given customer.")
        else:
            print("No orders to mark as delivered.")

    def change_menu(self, admin):
        print("\nChange Menu")
        print("1. Add Item to Menu")
        print("2. Update Item in Menu")
        print("3. Delete Item from Menu")
        print("4. Back to Admin Menu")

        choice = input("Enter your choice: ")

        if choice == '1':
            item_name = input("Enter new item name: ")
            item_price = float(input("Enter new item price: "))
            admin.add_menu(self.menu, item_name, item_price)
        elif choice == '2':
            item_name = input("Enter item name to update: ")
            new_price = float(input("Enter new price: "))
            if self.menu.update_item(item_name, new_price):
                print(f"{item_name} updated successfully.")
            else:
                print(f"Item '{item_name}' not found in the menu.")
        elif choice == '3':
            item_name = input("Enter item name to delete: ")
            if self.menu.remove_item(item_name):
                print(f"{item_name} deleted successfully.")
            else:
                print(f"Item '{item_name}' not found in the menu.")
        elif choice == '4':
            pass
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    restaurant = Restaurant()

    while True:
        print("\nWelcome to the Online Restaurant System")
        print("1. Login as Admin")
        print("2. Login as Customer")
        print("3. Login as Delivery")
        print("4. Exit")

        login_choice = input("Enter your choice: ")

        if login_choice == '1':
            restaurant.handle_admin()
        elif login_choice == '2':
            restaurant.handle_customer()
        elif login_choice == '3':
            restaurant.handle_delivery()
        elif login_choice == '4':
            print("Thank you for using our system!")
            break
        else:
            print("Invalid choice. Please try again.")
