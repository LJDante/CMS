-- Function to increment inventory quantity
CREATE OR REPLACE FUNCTION increment_inventory_quantity(inventory_id UUID, increment_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.inventory
  SET quantity_on_hand = quantity_on_hand + increment_amount
  WHERE id = inventory_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;