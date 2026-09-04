import React from 'react';
import BookingForm from './BookingForm';

export default function BookingModal({ initialVehicle = '', onClose }) {
  return <BookingForm initialVehicle={initialVehicle} onClose={onClose} />;
}
