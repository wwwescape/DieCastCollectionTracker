import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { CarInput } from "../api/types";
import { useCar, useUpdateCar } from "../hooks/useCars";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import CarForm, { carToFormValues } from "./CarForm";
import CarPhotoGallery from "./CarPhotoGallery";

const EditCarPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const carId = Number(id);
  const { data: car, isLoading } = useCar(Number.isFinite(carId) ? carId : undefined);
  const updateCar = useUpdateCar(carId);

  const handleSubmit = async (input: CarInput) => {
    try {
      await updateCar.mutateAsync(input);
      toast.success("Car updated!", TOAST_OPTIONS);
      navigate("/");
    } catch (error) {
      console.error("Error updating car:", error);
      toast.error("Error updating car. Please try again.", TOAST_OPTIONS);
    }
  };

  if (isLoading) {
    return <Paper sx={{ p: 3, textAlign: "center" }}>Loading...</Paper>;
  }
  if (!car) {
    return <Paper sx={{ p: 3, textAlign: "center" }}>Car not found.</Paper>;
  }

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Edit Car
      </Typography>
      <Stack spacing={2}>
        <CarForm
          initialValues={carToFormValues(car)}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
          showPhotoUpload={false}
        />
        <CarPhotoGallery carId={car.id} photos={car.photos} />
      </Stack>
    </>
  );
};

export default EditCarPage;
