import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { submitWriterRequest, getUserWriterRequest, WriterRequest, TargetAudience } from '../lib/writerRequests';
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  BookOpen, 
  FileText,
  Users,
  Tag,
  CheckCircle,
  AlertCircle,
  Clock,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WriterRequestFormProps {
  onClose?: () => void;
}

const AREAS_OF_INTEREST = [
  'Technology & Software',
  'Business & Management',
  'Marketing & Sales',
  'Finance & Accounting',
  'Human Resources',
  'Operations & Logistics',
  'Customer Service',
  'Legal & Compliance',
  'Healthcare',
  'Education & Training',
  'Research & Development',
  'Quality Assurance',
  'Project Management',
  'Data Analysis',
  'Design & Creative',
  'Other'
];

const TARGET_AUDIENCES: { value: TargetAudience; label: string }[] = [
  { value: 'beginners', label: 'Beginners (New to topic)' },
  { value: 'intermediate', label: 'Intermediate (Some experience)' },
  { value: 'advanced', label: 'Advanced (Expert level)' },
  { value: 'all-levels', label: 'All Levels' }
];

export const WriterRequestForm: React.FC<WriterRequestFormProps> = ({ onClose }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState<WriterRequest | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: userProfile?.email || '',
    phoneNumber: '',
    qualifications: '',
    areasOfInterest: [] as string[],
    proposedTitle: '',
    briefDescription: '',
    targetAudience: 'all-levels' as TargetAudience
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userProfile) {
      checkExistingRequest();
      setFormData(prev => ({
        ...prev,
        email: userProfile.email,
        fullName: userProfile.displayName || ''
      }));
    }
  }, [userProfile]);

  const checkExistingRequest = async () => {
    if (!userProfile) return;
    
    try {
      const request = await getUserWriterRequest(userProfile.uid);
      setExistingRequest(request);
      if (!request || request.status !== 'pending') {
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error checking existing request:', error);
      setShowForm(true);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    if (!formData.qualifications.trim()) {
      newErrors.qualifications = 'Qualifications are required';
    }

    if (formData.areasOfInterest.length === 0) {
      newErrors.areasOfInterest = 'Please select at least one area of interest';
    }

    if (!formData.proposedTitle.trim()) {
      newErrors.proposedTitle = 'Proposed title is required';
    }

    if (!formData.briefDescription.trim()) {
      newErrors.briefDescription = 'Brief description is required';
    } else if (formData.briefDescription.length < 250) {
      newErrors.briefDescription = 'Description must be at least 250 characters';
    } else if (formData.briefDescription.length > 500) {
      newErrors.briefDescription = 'Description must not exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile || !validateForm()) return;

    setLoading(true);
    try {
      const requestId = await submitWriterRequest({
        ...formData,
        userId: userProfile.uid
      });
      
      setSubmittedRequestId(requestId);
      toast.success('InfoWriter request submitted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Error submitting request');
    } finally {
      setLoading(false);
    }
  };

  const handleAreaToggle = (area: string) => {
    setFormData(prev => ({
      ...prev,
      areasOfInterest: prev.areasOfInterest.includes(area)
        ? prev.areasOfInterest.filter(a => a !== area)
        : [...prev.areasOfInterest, area]
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Show success message if request was just submitted
  if (submittedRequestId) {
    return (
      <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
        <div className="text-center">
          <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Submitted Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Your InfoWriter request has been submitted and is now under review.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Request ID:</strong> {submittedRequestId}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Please save this ID for tracking your request status.
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Show existing request status
  if (existingRequest && existingRequest.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
        <div className="text-center">
          <div className="bg-yellow-100 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Under Review</h2>
          <p className="text-gray-600 mb-4">
            You already have a pending InfoWriter request that is currently being reviewed by our admin team.
          </p>
          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Request ID:</strong> {existingRequest.requestId}
            </p>
            <p className="text-sm text-yellow-600 mt-1">
              Submitted on {existingRequest.submittedAt.toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            InfoWriter Application
          </h2>
          <p className="text-gray-600 mt-2">
            Apply to become an InfoWriter and contribute to our knowledge base
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Personal Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="text-red-600 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                />
              </div>
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.phoneNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your phone number"
                />
              </div>
              {errors.phoneNumber && (
                <p className="text-red-600 text-sm mt-1">{errors.phoneNumber}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic/Professional Qualifications *
            </label>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                value={formData.qualifications}
                onChange={(e) => handleInputChange('qualifications', e.target.value)}
                rows={4}
                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${
                  errors.qualifications ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Describe your educational background, certifications, work experience, and relevant qualifications..."
              />
            </div>
            {errors.qualifications && (
              <p className="text-red-600 text-sm mt-1">{errors.qualifications}</p>
            )}
          </div>
        </div>

        {/* Areas of Interest */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Tag className="h-5 w-5 mr-2 text-purple-600" />
            Areas of Interest/Expertise *
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {AREAS_OF_INTEREST.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => handleAreaToggle(area)}
                className={`p-3 text-sm rounded-lg border transition-all ${
                  formData.areasOfInterest.includes(area)
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
          {errors.areasOfInterest && (
            <p className="text-red-600 text-sm">{errors.areasOfInterest}</p>
          )}
        </div>

        {/* Article Proposal */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-green-600" />
            Article Proposal
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Article Title *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={formData.proposedTitle}
                onChange={(e) => handleInputChange('proposedTitle', e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.proposedTitle ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your proposed article title"
              />
            </div>
            {errors.proposedTitle && (
              <p className="text-red-600 text-sm mt-1">{errors.proposedTitle}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brief Description * (250-500 words)
            </label>
            <textarea
              value={formData.briefDescription}
              onChange={(e) => handleInputChange('briefDescription', e.target.value)}
              rows={6}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${
                errors.briefDescription ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Provide a detailed description of your proposed article, including key topics, objectives, and value it will bring to readers..."
            />
            <div className="flex justify-between items-center mt-2">
              {errors.briefDescription && (
                <p className="text-red-600 text-sm">{errors.briefDescription}</p>
              )}
              <p className={`text-sm ml-auto ${
                formData.briefDescription.length < 250 
                  ? 'text-red-500' 
                  : formData.briefDescription.length > 500 
                  ? 'text-red-500' 
                  : 'text-green-600'
              }`}>
                {formData.briefDescription.length}/500 words
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={formData.targetAudience}
                onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
              >
                {TARGET_AUDIENCES.map((audience) => (
                  <option key={audience.value} value={audience.value}>
                    {audience.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                <span>Submitting Request...</span>
              </div>
            ) : (
              'Submit InfoWriter Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};