import sqlite3
import os

def run_migration():
    db_path = os.path.join(os.path.dirname(__file__), "editresume.db")
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Creating billing_events table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS billing_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT,
        user_id INTEGER,
        session_id TEXT,
        event_type TEXT NOT NULL,
        plan_type TEXT,
        period TEXT,
        stripe_checkout_session_id TEXT,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        stripe_payment_intent_id TEXT,
        failure_code TEXT,
        failure_message TEXT,
        referrer TEXT,
        raw_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    """)
    
    # Add indexes for performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_billing_events_uid ON billing_events (uid)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events (event_type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_checkout_session_id ON billing_events (stripe_checkout_session_id)")

    conn.commit()
    conn.close()
    print("Migration completed successfully.")

if __name__ == "__main__":
    run_migration()
