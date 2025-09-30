import React, { useState } from 'react';

const InterviewScheduleModal = ({ 
  isOpen, 
  onClose, 
  onSchedule, 
  candidateName, 
  jobTitle,
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    message: '',
    numberOfQuestions: 5
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (!formData.numberOfQuestions || formData.numberOfQuestions < 1) {
      newErrors.numberOfQuestions = 'Number of questions must be at least 1';
    }

    if (formData.numberOfQuestions > 20) {
      newErrors.numberOfQuestions = 'Number of questions cannot exceed 20';
    }
    
    if (formData.date && formData.startTime && formData.endTime) {
      // Create dates in local timezone to avoid timezone issues
      const selectedDate = formData.date;
      let startDateTime = new Date(`${selectedDate}T${formData.startTime}:00`);
      let endDateTime = new Date(`${selectedDate}T${formData.endTime}:00`);
      const now = new Date();
      
      // If end time is before start time, assume it's the next day
      if (endDateTime <= startDateTime) {
        endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
      }
      
      // Check if the scheduled time is in the past (with 5 minute buffer)
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      if (startDateTime.getTime() <= (now.getTime() + bufferTime)) {
        newErrors.startTime = 'Start time must be at least 5 minutes in the future';
      }

      // For overnight interviews, we don't need to check if end time is in the past
      // since it could legitimately be the next day
      
      // Minimum duration check (at least 15 minutes)
      const durationMs = endDateTime.getTime() - startDateTime.getTime();
      const durationMinutes = durationMs / (1000 * 60);
      
      if (durationMinutes < 15) {
        newErrors.endTime = 'Interview must be at least 15 minutes long';
      }

      // Maximum duration check (at most 12 hours to allow overnight interviews)
      if (durationMinutes > 720) { // 12 hours
        newErrors.endTime = 'Interview cannot exceed 12 hours';
      }

      // Warn about overnight interviews
      if (endDateTime.getDate() !== startDateTime.getDate()) {
        // This is an overnight interview - add a note but don't error
        // You could add a warning message here if needed
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Create proper ISO datetime strings
    let startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
    let endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);
    
    // If end time is before start time, assume it's the next day
    if (endDateTime <= startDateTime) {
      endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
    }
    
    onSchedule({
      start_at: startDateTime.toISOString(),
      end_at: endDateTime.toISOString(),
      number_of_questions: parseInt(formData.numberOfQuestions),
      message: formData.message || `You have been invited to interview for ${jobTitle}. Please check your invitations to accept or decline.`
    });
  };

  const handleClose = () => {
    setFormData({
      date: '',
      startTime: '',
      endTime: '',
      message: '',
      numberOfQuestions: 5
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  // Get today's date in YYYY-MM-DD format (local timezone)
  const today = new Date();
  const todayString = today.getFullYear() + '-' + 
                     String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(today.getDate()).padStart(2, '0');

  // Get current time in HH:MM format
  const currentHours = String(today.getHours()).padStart(2, '0');
  const currentMinutes = String(today.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHours}:${currentMinutes}`;

  const isToday = formData.date === todayString;

  // Calculate minimum time for today (current time + 5 minutes)
  let minTime = '';
  if (isToday) {
    const minDateTime = new Date(today.getTime() + 5 * 60 * 1000); // Add 5 minutes
    const minHours = String(minDateTime.getHours()).padStart(2, '0');
    const minMinutes = String(minDateTime.getMinutes()).padStart(2, '0');
    minTime = `${minHours}:${minMinutes}`;
  }

  // Check if this would be an overnight interview
  const isOvernightInterview = formData.startTime && formData.endTime && 
                              formData.startTime > formData.endTime;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Schedule Interview
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Candidate:</span> {candidateName}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Position:</span> {jobTitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Interview Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                min={todayString}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-1">{errors.date}</p>
              )}
              {isToday && (
                <p className="text-blue-600 text-xs mt-1">
                  ℹ️ Today selected - minimum time is 5 minutes from now
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  min={isToday ? minTime : undefined}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.startTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.startTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
                )}
                {isToday && (
                  <p className="text-xs text-gray-500 mt-1">
                    Current time: {currentTime} | Min: {minTime}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.endTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.endTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>
                )}
                {isOvernightInterview && (
                  <p className="text-amber-600 text-xs mt-1">
                    ⚠️ This will be an overnight interview (ends next day)
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="numberOfQuestions" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Questions
              </label>
              <select
                id="numberOfQuestions"
                name="numberOfQuestions"
                value={formData.numberOfQuestions}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.numberOfQuestions ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>
                    {num} question{num > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              {errors.numberOfQuestions && (
                <p className="text-red-500 text-sm mt-1">{errors.numberOfQuestions}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Select the number of questions for the interview (1-20)
              </p>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Custom Message (Optional)
              </label>
              <textarea
                id="message"
                name="message"
                rows={3}
                value={formData.message}
                onChange={handleInputChange}
                placeholder={`You have been invited to interview for ${jobTitle}. Please check your invitations to accept or decline.`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scheduling...
                  </>
                ) : (
                  'Schedule Interview'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InterviewScheduleModal;