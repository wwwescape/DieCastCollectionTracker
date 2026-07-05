import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Typography from "@mui/material/Typography";
import type { CarInput } from "../api/types";
import { useCreateCar } from "../hooks/useCars";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import CarForm from "./CarForm";

const AddCarPage = () => {
  const navigate = useNavigate();
  const createCar = useCreateCar();

  const handleSubmit = async (input: CarInput) => {
    try {
      await createCar.mutateAsync(input);
      toast.success("Car added!", TOAST_OPTIONS);
      navigate("/");
    } catch (error) {
      console.error("Error adding car:", error);
      toast.error("Error adding car. Please try again.", TOAST_OPTIONS);
    }
  };

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Add Car
      </Typography>
      <CarForm submitLabel="Add Car" onSubmit={handleSubmit} />
    </>
  );
};

export default AddCarPage;
